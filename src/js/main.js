import jquery from "jquery";
const $ = jquery
import "bootstrap-table";
import FileSaver from 'file-saver';
import jwtDecode from "jwt-decode";
import 'bootstrap-table';
import '@fortawesome/fontawesome-free/css/all.css';
import '@fortawesome/fontawesome-free/js/all.js';
import 'roboto-fontface/css/roboto/roboto-fontface.css';
import '../sass/main.scss';
import './config.js'
import 'bootstrap/dist/js/bootstrap.bundle'

// ==================== CONSTANTS ====================
const ACTIVATED_STATUSES = ['ok', 'expired', 'suspended', 'grace_period_over'];
const STATUS_SECTIONS = [
    'onlineActivationUi',
    'onlineDeactivationUi',
    'offlineActivationUiOne',
    'offlineActivationUiTwo',
    'offlineDeactivationUi',
    'offlineDeactivationGuide'
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IGNORE_PROPERTIES = ['index', 'id', '0', 'createdDate', 'lastUpdated', 'expiryDate', 'osVer', 'metadata', 'meterAttributes'];
const TIME_PROPERTIES = ['createdAt', 'updatedAt', 'expiresAt'];

// ==================== UTILITY FUNCTIONS ====================
function isTokenValid() {
    try {
        const timestamp = Math.floor((new Date()).getTime() / 1000);
        const accessToken = localStorage.getItem("accessToken"); // rename to accessToken
        if (accessToken == "" || jwtDecode(accessToken).exp < timestamp) {

            return false;
        }
        return true;
    } catch {
        return false;
    }
}

function checkStatus(status) {
    if (status == 401 && !location.href.includes("login")) {
        location.href = "login.html"
    }
}

function getAuthHeaders() {
    return { Authorization: 'Bearer ' + localStorage.getItem("accessToken") };
}

function getAjaxConfig() {
    return {
        contentType: "application/json; charset=utf-8",
        dataType: "json"
    };
}

function toTitleCase(text) {
    if (!text) return;
    const titleCase = text.replace(/([A-Z]+)/g, ' $1').replace(/([A-Z][a-z])/g, ' $1');
    return titleCase.charAt(0).toUpperCase() + titleCase.slice(1);
}

function formatDate(timestamp, includeTime = false) {
    const d = new Date(timestamp * 1000);
    const month = MONTHS[d.getMonth()];
    const yyyy = d.getFullYear();
    const mm = ('0' + (d.getMonth() + 1)).slice(-2);
    const dd = ('0' + d.getDate()).slice(-2);
    
    if (!includeTime) {
        return `${month}-${dd}-${yyyy}`;
    }
    
    let hh = d.getHours();
    let h = hh;
    const min = ('0' + d.getMinutes()).slice(-2);
    let ampm = 'AM';
    
    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh == 0) {
        h = 12;
    }
    
    return `${month}-${dd}-${yyyy}, ${h}:${min} ${ampm}`;
}

// ==================== STATUS MANAGEMENT ====================
let currentActivationStatus = false;

function isActivatedStatus(status) {
    return ACTIVATED_STATUSES.includes(String(status || '').toLowerCase());
}

function updateAllStatusBadges(isActivated) {
    STATUS_SECTIONS.forEach(function(sectionId) {
        const $badge = $('#' + sectionId).find('.online-active-stats, .online-deactive-stats');
        if ($badge.length) {
            $badge
                .removeClass('online-active-stats online-deactive-stats')
                .addClass(isActivated ? 'online-active-stats' : 'online-deactive-stats')
                .find('.stats-text').text(isActivated ? 'Activated' : 'Not Activated');
        }
    });
}

function updateCard4Color(isActivated) {
    if (isActivated) {
        $("#card4").removeClass("card-stats").addClass("card-stats-ok");
    } else {
        $("#card4").removeClass("card-stats-ok").addClass("card-stats");
    }
}

function updateActivationStatus(isActivated) {
    currentActivationStatus = isActivated;
    updateAllStatusBadges(isActivated);
    updateCard4Color(isActivated);
}

// Function to update tab text based on activation status
function updateTabText(isActivated) {
    if (isActivated) {
        $('#tabActivation').text('REACTIVATE');
    } else {
        $('#tabActivation').text('ACTIVATE');
    }
    // DEACTIVATE tab always stays the same
}

// ==================== UI HELPERS ====================
function showElement(selector) {
    $(selector).removeClass("hide-element");
}

function hideElement(selector) {
    $(selector).addClass("hide-element");
}

function toggleElements(show, hide) {
    if (Array.isArray(show)) show.forEach(s => showElement(s));
    else if (show) showElement(show);
    
    if (Array.isArray(hide)) hide.forEach(s => hideElement(s));
    else if (hide) hideElement(hide);
}

// ==================== MAIN CODE ====================
if (!isTokenValid() && !location.href.includes("login")) {
    // token has expired redirect to login [age]
    location.href = "login.html"
}

$(document).ready(function () {
    // debugger;
    var $table = $('#table')
    var $remove = $('#remove')
    var selections = []

    // Initialize branding
    $("#companyName, #branding").html(Cryptlex.title);
    $("#copyright").html(Cryptlex.footer);

    // ==================== DATA FORMATTING ====================
    function dataFormatter(rows) {
        rows.forEach(row => {
            row.createdDate = formatDate(row.createdAt, true);
            row.lastUpdated = formatDate(row.updatedAt, true);
            row.expiryDate = formatDate(row.expiresAt, true);
            row.osVer = `${row.os} ${row.osVersion}`;
        });
    }

    function sortMetadata(a, b) {
        return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    }

    function detail(index, row, $detail) {
        const html = [];
        
        // Add row properties
        Object.keys(row).forEach(prop => {
            if (IGNORE_PROPERTIES.includes(prop)) return;
            
            const key = toTitleCase(prop);
            const value = TIME_PROPERTIES.includes(prop) 
                ? formatDate(row[prop], true) 
                : row[prop];
            
            html.push(`<p><label class="detail-section"><b>${key}:</label></b> ${value}</p>`);
        });
        
        // Add metadata
        html.push('<hr/><h5>Metadata</h5><hr/>');
        if (row.metadata) {
            row.metadata.sort(sortMetadata).forEach(item => {
                const key = item.key.replace("<", "&lt;").toUpperCase();
                const value = toTitleCase(item.value.replace("<", "&lt;"));
                html.push(`<p><label class="metadata-section detail-section abc"><b>${key}:</b></label>${value}</p>`);
            });
        }
        
        return html.join('');
    }

    // ==================== STATS MANAGEMENT ====================
    function loadStats() {
        $.ajax({
            url: "api/server/stats",
            headers: getAuthHeaders(),
            method: 'GET'
        }).done(function (data) {
            $("#card1").html(`${data.totalFloatingClients}/${data.allowedFloatingClients}`);
            $("#card2").html(`${data.leaseDuration} <small>SECS</small>`);
            
            if (data.expiresAt != 0) {
                $("#card3").html(formatDate(data.expiresAt));
            }
            
            const status = String(data.status || '').replace("_", " ");
            $("#card4").html(status);
            
            updateActivationStatus(isActivatedStatus(data.status));
            updateTabText(isActivatedStatus(data.status));
            $("#version").html(`v${data.version}`);
        }).fail(function (data) {
            checkStatus(data.status);
        });
    }

    // ==================== TABLE SETUP ====================
    $table.on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
        $remove.prop('disabled', !$table.bootstrapTable('getSelections').length);
        selections = getIdSelections();
    });

    $remove.click(function () {
        const ids = getIdSelections();
        $table.bootstrapTable('remove', { field: 'id', values: ids });
        $remove.prop('disabled', true);
    });

    $table.bootstrapTable({
        url: "api/floating-licenses",
        ajaxOptions: {
            headers: getAuthHeaders()
        },
        onLoadError: checkStatus,
        onPreBody: dataFormatter,
        onRefresh: loadStats,
        columns: [
            { checkbox: true, align: 'center', valign: 'middle' },
            { field: "hostname", title: "Host Name" },
            { field: "ip", title: "IP Address" },
            { field: "osVer", title: "OS" },
            { field: "createdDate", title: "Created at" },
            { field: "lastUpdated", title: "Last Refreshed at" },
            { field: "expiryDate", title: "Expires at" }
        ],
        pagination: true,
        pageList: [10, 25, 50],
        search: true,
        showRefresh: true,
        showFullscreen: true,
        detailViewByClick: true,
        detailView: true,
        detailFormatter: detail,
        checkboxHeader: true
    });

    // ==================== TAB NAVIGATION ====================
    $('#tabActivation').on('click', function (e) {
        e.preventDefault();
        toggleElements('#onlineActivationUi', ['#offlineActivationUiOne', '#offlineActivationUiTwo', '#onlineDeactivationUi', '#offlineDeactivationUi', '#offlineDeactivationGuide']);
        $('#tabActivation').addClass('active');
        $('#tabDeactivation').removeClass('active');
    });
    
    $('#tabDeactivation').on('click', function (e) {
        e.preventDefault();
        toggleElements('#onlineDeactivationUi', ['#onlineActivationUi', '#offlineActivationUiOne', '#offlineActivationUiTwo', '#offlineDeactivationUi']);
        $('#tabDeactivation').addClass('active');
        $('#tabActivation').removeClass('active');
    });
    
    $('#tabActivation').trigger('click');

    // ==================== SWITCH HANDLERS ====================
    const switchHandlers = {
        'switchToOffActivation': { show: '#offlineActivationUiOne', hide: '#onlineActivationUi' },
        'switchToOffActivation2': { show: '#offlineActivationUiOne', hide: '#offlineDeactivationGuide' },
        'switchToOnlineActivation': { show: '#onlineActivationUi', hide: '#offlineActivationUiOne' },
        'switchToOnlineActivation2': { show: '#onlineActivationUi', hide: '#offlineActivationUiTwo' },
        'switchToOffDeactivation': { show: '#offlineDeactivationUi', hide: '#onlineDeactivationUi' },
        'switchToOnlineDeactivation': { show: '#onlineDeactivationUi', hide: '#offlineDeactivationUi' }
    };

    Object.keys(switchHandlers).forEach(id => {
        $(`#${id}`).click(function() {
            const { show, hide } = switchHandlers[id];
            toggleElements(show, hide);
            if (id === 'switchToOffActivation') {
                updateAllStatusBadges(currentActivationStatus);
                updateTabText(currentActivationStatus);
            }
        });
    });

    // ==================== OFFLINE ACTIVATION STEP 1 ====================
    $("#offlineActivationstep1").submit(function (e) {
        e.preventDefault();
        $("#offlineKey").val($("#keyToGen").val());
        toggleElements('#offlineActivationUiTwo', '#offlineActivationUiOne');
    });

    $("#previousBtn").click(function () {
        toggleElements('#offlineActivationUiOne', '#offlineActivationUiTwo');
    });

    $("#deactivateOfflineUi").click(function () {
        deactivationkey = { licenseKey: $("#deactivationKeyOffline").val() };
        toggleElements('#offlineDeactivationGuide', '#offlineDeactivationUi');
    });

    // ==================== API CALL HELPERS ====================
    function handleActivationSuccess() {
        updateActivationStatus(true);
        updateTabText(true);
    }

    function handleDeactivationSuccess() {
        updateActivationStatus(false);
        updateTabText(false);
    }

    function handleError(errorData, errorSelector, defaultMessage) {
        const errorCode = errorData.responseJSON && errorData.responseJSON.code ? errorData.responseJSON.code : 'Unknown error';
        const errorMessage = `${defaultMessage}: ${errorCode}`;
        $(errorSelector + ' .response-text, ' + errorSelector + ' h6').text(errorMessage);
        showElement(errorSelector);
    }

    // ==================== ONLINE ACTIVATION ====================
    $("#activateOnline").submit(function (e) {
        e.preventDefault();
        toggleElements('#activatingBtn', '#mainBtn');
        $("#activating").prop('disabled', true);

        $.ajax({
            type: "POST",
            url: "api/server/activate",
            headers: getAuthHeaders(),
            data: JSON.stringify({ licenseKey: $("#keyOnline").val() }),
            ...getAjaxConfig()
        }).done(function (data) {
            showElement('#onlineMsgSuccessActivate');
            toggleElements('#mainBtn', '#activatingBtn');
            $('#keyOnline').val("");
            $("#activate").prop('disabled', false);
            handleActivationSuccess();
        }).fail(function (data) {
            handleError( data, '#onlineMsgFailActivate', 'Server activation failed');
            toggleElements('#mainBtn', '#activatingBtn');
            $("#activating").prop('disabled', false);
        });
    });

    // ==================== ONLINE DEACTIVATION ====================
    $("#deactivateOnline").submit(function (e) {
        e.preventDefault();
        toggleElements('#deactivatingBtn', '#deactivate');
        $("#deactivating").prop('disabled', true);

        $.ajax({
            type: "POST",
            url: "api/server/deactivate",
            headers: getAuthHeaders(),
            data: JSON.stringify({ licenseKey: $("#keyOnlineDeactivation").val() }),
            ...getAjaxConfig()
        }).done(function (data) {
            toggleElements(['#deactivate', '#onlineMsgSuccessDeactivate'], '#deactivatingBtn');
            $(".form-check-input").prop("checked", false);
            $('#keyOnlineDeactivation').val("");
            handleDeactivationSuccess();
        }).fail(function (data) {
            handleError(data, '#onlineMsgFailDeactivate', 'Server deactivation failed');
            toggleElements(['#deactivate'], '#deactivatingBtn');
            $("#deactivating").prop('disabled', false);
        });
    });

    // ==================== OFFLINE ACTIVATION STEP 1 ====================
    $("#generateBtn").click(function (e) {
        e.preventDefault();
        $.ajax({
            type: "POST",
            url: "api/server/offline-activation-request",
            headers: getAuthHeaders(),
            data: JSON.stringify({ licenseKey: $("#keyToGen").val() }),
            ...getAjaxConfig()
        }).done(function (data) {
            const blob = new Blob([data.offlineRequest], { type: "text/plain;charset=utf-8" });
            FileSaver.saveAs(blob, "offline_activation_request.txt");
            showElement('#offlineMsgSuccess1');
        }).fail(function (data) {
            handleError( data, '#offlineMsgFail1', 'Failed to generate offline activation request');
        });
    });

    // ==================== OFFLINE ACTIVATION STEP 2 ====================
    $("#offlineActivationStep2").submit(function (e) {
        e.preventDefault();
        toggleElements('#activatingOffline', '#activateOffline');
        $("#activatingOffline").prop('disabled', true);

        $.ajax({
            type: "POST",
            url: "api/server/offline-activate",
            headers: getAuthHeaders(),
            data: JSON.stringify({
                licenseKey: $("#offlineKey").val(),
                offlineResponse: $("#responseFile").val()
            }),
            ...getAjaxConfig()
        }).done(function (data) {
            toggleElements(['#activateOffline', '#offlineDeactivationUi', '#offlineMsgSuccess2'], '#offlineActivationUiTwo');
            toggleElements('#deactivationTab', '#activationTab');
            $('#keyToGen, #offlineKey, #responseFile').val("");
            handleActivationSuccess();
        }).fail(function (data) {
            handleError(data, '#offlineMsgFail2', 'Offline activation failed');
            toggleElements('#activateOffline', '#activatingOffline');
            $("#activatingOffline").prop('disabled', false); 
        });
    });

    // ==================== OFFLINE DEACTIVATION ====================
    $("#deactivateOffline").submit(function (e) {
        e.preventDefault();
        toggleElements('#deactivatingGen', '#deactivationGenerateBtn');
        $("#deactivating123").prop('disabled', true);

        $.ajax({
            type: "POST",
            url: "api/server/offline-deactivate",
            headers: getAuthHeaders(),
            data: JSON.stringify({ licenseKey: $("#deactivationKeyOffline").val() }),
            ...getAjaxConfig()
        }).done(function (data) {
            const blob = new Blob([data.offlineRequest], { type: "text/plain;charset=utf-8" });
            FileSaver.saveAs(blob, "offline_deactivation_request.txt");
            
            toggleElements(['#offlineMsgSuccessForDeactivation', '#offlineDeactivationGuide', '#activationTab'], 
                          ['#offlineDeactivationUi', '#deactivationTab', '#deactivatingGen']);
            showElement('#deactivationGenerateBtn');
            $('#deactivationKeyOffline').val("");
            handleDeactivationSuccess();
        }).fail(function (data) {
            handleError(data, '#offlineMsgFailForDeactivation', 'Failed to generate offline deactivation request');
            toggleElements(['#deactivationGenerateBtn'], ['#deactivatingGen', '#deactivating123']);
            $("#deactivating123").prop('disabled', false);
        });
    });

    // ==================== LOGIN/LOGOUT ====================
    $("#loginBtn").submit(function (e) {
        e.preventDefault();
        $.ajax({
            type: "POST",
            url: "api/login",
            data: JSON.stringify({
                userName: $("#userName").val(),
                password: $("#password").val()
            }),
            ...getAjaxConfig()
        }).done(function (data) {
            localStorage.setItem("accessToken", data.accessToken);
            location.href = "index.html";
        }).fail(function (data) {
            showElement("#authenticationAlert");
        });
    });

    $("#logout, #logoutSettingPage").click(function () {
        localStorage.clear();
        location.href = "login.html";
    });

    // ==================== INITIALIZE ====================
    loadStats();

});