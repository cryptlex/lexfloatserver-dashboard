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


let deactivationkey;

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

if (!isTokenValid() && !location.href.includes("login")) {
    // token has expired redirect to login [age]
    location.href = "login.html"
}

$(document).ready(function () {
    // debugger;
    var $table = $('#table')
    var $remove = $('#remove')
    var selections = []
    const ignoreProperties = ['index', 'id', '0', 'createdDate', 'lastUpdated', 'expiryDate', 'osVer', 'metadata']
    const timeProperties = ['createdAt', 'updatedAt', 'expiresAt']
    const abbrevationProperties = ['ip', 'os']

    // timestamp= 0;
    function expirationDate(timestamp) {
        var d = new Date(timestamp * 1000),
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            month = months[d.getMonth()],
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),	// Months are zero based. Add leading 0.
            dd = ('0' + d.getDate()).slice(-2),	// Add leading 0.
            time = month + '-' + dd + '-' + yyyy;

        return time;
    }
    function dateFormatter(timestamp) {

        var d = new Date(timestamp * 1000),
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            month = months[d.getMonth()],
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),	// Months are zero based. Add leading 0.
            dd = ('0' + d.getDate()).slice(-2),	// Add leading 0.
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),	// Add leading 0.
            ampm = 'AM',
            time

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh == 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM	
        time = month + '-' + dd + '-' + yyyy + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    }
    function dataFormatter(rows) {


        for (let row of rows) {
            row.createdDate = dateFormatter(row.createdAt);
            row.lastUpdated = dateFormatter(row.updatedAt);
            row.expiryDate = dateFormatter(row.expiresAt);
            row.osVer = row.os + " " + row.osVersion;
        }

    }
    function checkStatus(status){
        if(status == 401 && !location.href.includes("login")){
            // console.log("yes 401")
            location.href = "login.html"
          }
    }
    $("#companyName").html(Cryptlex.title);
    $("#branding").html(Cryptlex.title);
    $("#copyright").html(Cryptlex.footer)

    // request for stats
    $.ajax({

        // url: "./stats.json",
        url: "/api/server/stats",
        headers: { Authorization: 'Bearer ' + localStorage.getItem("accessToken") },
        method: 'GET',
        // success: function (data) {
        }).done(function (data) {
            let card1 = (data.totalLicenses - data.availableLicenses) + '/' + data.totalLicenses
            $("#card1").html(card1);
            let card2 = data.leaseDuration + ' <small>SECS</small>'
            $("#card2").html(card2);

            if (data.expiresAt != 0) {
                let card3 = expirationDate(data.expiresAt)
                $("#card3").html(card3);
            }
            let card4 = data.status
            let card4Stats = card4.replace("_", " ");
            $("#card4").html(card4Stats);
            if (card4 === "ok") {
                $("#onlineActivationUi").addClass("hide-element");
                $("#onlineDeactivationUi").removeClass("hide-element");
                $("#card4").removeClass("card-stats");
                $("#card4").addClass("card-stats-ok");
                $("#deactivationTab").removeClass("hide-element");
            }
            else {
                $("#onlineDeactivationUi").addClass("hide-element");
                $("#onlineActivationUi").removeClass("hide-element");
                $("#card4").removeClass("card-stats-ok");
                $("#card4").addClass("card-stats");
                $("#activationTab").removeClass("hide-element");
            }
            let version = data.version
            console.log(data.version);
            $("#version").html(version);

        }).fail(function (data) {
            // console.log(data.status);
            checkStatus(data.status);
            
        });

        
    // });

    function detail(index, row, $detail) {
        debugger;
        const html = [];
        const a = [];
        for (let prop in row) {
            if (ignoreProperties.includes(prop)) {
                continue;
            }
            let value;
            let key;
            if (timeProperties.includes(prop)) {
                key = toTitleCase(prop);
                value = dateFormatter(row[prop]);
            }
            else {
                value = row[prop];
                key = toTitleCase(prop);
            }

            html.push('<p><label class="detail-section"><b>' + `${key}` + ':</label></b> ' + `${value}` + '</p>')
        }
        html.push('<hr/><h5>Metadata</h5><hr/>')
        for (let i = 0; i < row.metadata.length; i++) {
            html.push('<p><label class="metadata-section abc"><b>' + row.metadata[i].key + ':</b></label>' + row.metadata[i].value + '</p>')
        }
        html.push('</tbody>')
        return html.join('');

    }
    function toTitleCase(text) {
        if (!text) {
            return;
        }
        const titleCase = text.replace(/([A-Z]+)/g, ' $1').replace(/([A-Z][a-z])/g, ' $1');
        return titleCase.charAt(0).toUpperCase() + titleCase.slice(1);
    }

    $table.on('check.bs.table uncheck.bs.table ' +
        'check-all.bs.table uncheck-all.bs.table',
        function () {
            $remove.prop('disabled', !$table.bootstrapTable('getSelections').length)
            selections = getIdSelections()
        })


    $remove.click(function () {
        var ids = getIdSelections()
        $table.bootstrapTable('remove', {
            field: 'id',
            values: ids
        })
        $remove.prop('disabled', true)
    })


    $("#switchToOffActivation").click(function () {
        $("#onlineActivationUi").addClass("hide-element");
        $("#offlineActivationUiOne").removeClass("hide-element");

    });
    $("#switchToOffActivation2").click(function () {
        $("#offlineDeactivationGuide").addClass("hide-element");
        $("#offlineActivationUiOne").removeClass("hide-element");

    });
    $("#switchToOnlineActivation").click(function () {
        $("#offlineActivationUiOne").addClass("hide-element");
        $("#onlineActivationUi").removeClass("hide-element");

    });


    $("#switchToOnlineActivation2").click(function () {
        $("#offlineActivationUiTwo").addClass("hide-element");
        $("#onlineActivationUi").removeClass("hide-element");

    });

    $("#switchToOffDeactivation").click(function () {
        $("#onlineDeactivationUi").addClass("hide-element");
        $("#offlineDeactivationUi").removeClass("hide-element");
    });
    $("#switchToOnlineDeactivation").click(function () {
        $("#offlineDeactivationUi").addClass("hide-element");
        $("#onlineDeactivationUi").removeClass("hide-element");
    });

    // Next btn
    $("#offlineActivationstep1").submit(function (e) {
        // debugger;
        e.preventDefault();
        let key = $("#keyToGen").val();
        $("#offlineKey").val(key);
        $("#offlineActivationUiOne").addClass("hide-element");
        $("#offlineActivationUiTwo").removeClass("hide-element");
        // $("#progressLink").removeClass("progress-link");
        // $("#progressLink").addClass("progress-link-colored");
        // $('#onlineActivationUi').addClass("hide-element");

    });
    $("#previousBtn").click(function () {
        // debugger;
        $("#offlineActivationUiTwo").addClass("hide-element");
        $("#offlineActivationUiOne").removeClass("hide-element");
    });
    $("#deactivateOfflineUi").click(function () {
        deactivationkey = {
            licenseKey: $("#deactivationKeyOffline").val()
        };
        $("#offlineDeactivationUi").addClass("hide-element");
        $("#offlineDeactivationGuide").removeClass("hide-element");

    });


    // table.....
    let table = $('#table').bootstrapTable(
        {
            url: "/api/floating-licenses",
            // url: './activations.json',
            ajaxOptions: { headers: { 'Authorization': 'Bearer ' + localStorage.getItem("accessToken") }
        
            // beforeSend: function () {
            //     console.log("before send");
            // }
        },
            onLoadSuccess: function (status) {
                // console.log("success floating") //ajax success
            },
            onLoadError: function (status) {
                // console.log("fail floating..") 
                checkStatus(status)
                 
            },
            onPreBody: dataFormatter,
            // onExpandRow: row,
            columns: [
                {
                    checkbox: true,
                    align: 'center',
                    valign: 'middle'
                },
                {
                    "field": "hostname",
                    "title": "Host Name"
                },
                {
                    "field": "ip",
                    "title": "IP Address"
                },
                {
                    "field": "osVer",
                    "title": "OS"
                },
                {
                    "field": "createdDate",
                    "title": "Created at"
                },
                {
                    "field": "lastUpdated",
                    "title": "Last Refreshed at"
                },
                {
                    "field": "expiryDate",
                    "title": "Expires at"
                }
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

        }
    );
    // Login page

    $("#loginBtn").submit(function (e) {

        e.preventDefault();
        let url = "/api/login"
        const credentials = {
            userName: $("#userName").val(),
            password: $("#password").val()
        }
        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(credentials),
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        }).done(function (data) {

            // let token = JSON.parse(data)
            localStorage.setItem("accessToken", data.accessToken);
            //redirect to the dashboard
            location.href = "index.html"// /app

        }).fail(function (data) {

            //redirect back to the login page
            // location.href = "login.html"
            // alert
            $("#authenticationAlert").removeClass("hide-element");
        });
    });
    $("#logout").click(function(){
        localStorage.clear();
        location.href = "login.html"
    })
    $("#logoutSettingPage").click(function(){
        localStorage.clear();
        location.href = "login.html"
    })

    // Settings page online activation

    $("#activateOnline").submit(function (e) {
        // debugger;
        e.preventDefault();
        $("#mainBtn").addClass("hide-element");
        $("#activatingBtn").removeClass("hide-element");
        $("#activating").prop('disabled', true);

        let url = "/api/server/activate"
        const activationkey = {
            licenseKey: $("#keyOnline").val()
        };

        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(activationkey),
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        }).done(function (data) {

            $("#onlineMsgSuccessActivate").removeClass("hide-element");
            $("#activatingBtn").addClass("hide-element");
            $("#onlineDeactivationUi").removeClass("hide-element");
            $("#onlineActivationUi").addClass("hide-element");
            $("#activationTab").addClass("hide-element");
            $("#deactivationTab").removeClass("hide-element");
            $('#keyOnline').val("");
            $("#activate").prop('disabled', false);

        }).fail(function (data) {
            $("#onlineMsgFailActivate").removeClass("hide-element");
            $("#mainBtn").removeClass("hide-element");
            $("#activatingBtn").addClass("hide-element");
        });
    });

    // settings page  Online Deactivation

    $("#deactivateOnline").submit(function (e) {
        // debugger;
        e.preventDefault();
        $("#deactivate").addClass("hide-element");
        $("#deactivatingBtn").removeClass("hide-element");
        $("#deactivating").prop('disabled', true);

        let url = "/api/server/deactivate"
        const activationkey = {
            licenseKey: $("#keyOnlineDeactivation").val()

        };
        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(activationkey),
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        }).done(function (data) {
            // // debugger;
            $("#deactivatingBtn").addClass("hide-element");
            $("#deactivate").removeClass("hide-element");
            $("#onlineMsgSuccessDeactivate").removeClass("hide-element");
            $("#mainBtn").removeClass("hide-element");
            $("#onlineActivationUi").removeClass("hide-element");
            $("#onlineDeactivationUi").addClass("hide-element");
            $(".form-check-input").prop("checked", false);
            $('#keyOnlineDeactivation').val("");
            $("#activationTab").removeClass("hide-element");
            $("#deactivationTab").addClass("hide-element");

        }).fail(function (data) {
            $("#deactivatingBtn").addClass("hide-element");
            $("#onlineMsgFailDeactivate").removeClass("hide-element");
            $("#deactivate").removeClass("hide-element");

        });
    });

    //settings page offline activation step 1 generating request file

    $("#generateBtn").click(function (e) {
        //  debugger;
        e.preventDefault();
        let url = "/api/server/offline-activation-request"
        const activationkey = {
            licenseKey: $("#keyToGen").val()

        };
        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(activationkey),
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        }).done(function (data) {
            var blob = new Blob([data.offlineRequest], { type: "text/plain;charset=utf-8" });
            FileSaver.saveAs(blob, "offline_activation_request.txt");
            $("#offlineMsgSuccess1").removeClass("hide-element");

        }).fail(function (data) {
            $("#offlineMsgFail1").removeClass("hide-element");
        });

    });

    // settings page offline activation step 2 

    $("#offlineActivationStep2").submit(function (e) {
        debugger;
        e.preventDefault();
        $("#activateOffline").addClass("hide-element");
        $("#activatingOffline").removeClass("hide-element");
        $("#activatingOffline").prop('disabled', true);
        let url = "/api/server/offline-activate"
        const activationkey = {
            licenseKey: $("#offlineKey").val(),
            offlineResponse: $("#responseFile").val()

        };
        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(activationkey),
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        }).done(function (data) {

            $("#offlineActivationUiTwo").addClass("hide-element");
            $("#activateOffline").removeClass("hide-element");
            $("#offlineDeactivationUi").removeClass("hide-element");
            $("#offlineMsgSuccess2").removeClass("hide-element");
            $("#activationTab").addClass("hide-element");
            $("#deactivationTab").removeClass("hide-element");
            $('#keyToGen').val("");
            $('#offlineKey').val("");
            $('#responseFile').val("");

        }).fail(function (data) {

            $("#offlineMsgFail2").removeClass("hide-element");
            $("#activatingOffline").addClass("hide-element");
            $("#activateOffline").removeClass("hide-element");

        });
    });

    // settings page offline deactivation

    $("#deactivateOffline").submit(function (e) {
        //  debugger;
        e.preventDefault();

        $("#deactivationGenerateBtn").addClass("hide-element");
        $("#deactivatingGen").removeClass("hide-element");
        $("#deactivating123").prop('disabled', true);
        let url = "/api/server/offline-deactivate"
        deactivationkey = {
            licenseKey: $("#deactivationKeyOffline").val()

        };

        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(deactivationkey),
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        }).done(function (data) {
            var blob = new Blob([data.offlineRequest], { type: "text/plain;charset=utf-8" });
            FileSaver.saveAs(blob, "offline_deactivation_request.txt");

            $("#offlineMsgSuccessForDeactivation").removeClass("hide-element");
            $("#offlineDeactivationUi").addClass("hide-element");
            $("#offlineDeactivationGuide").removeClass("hide-element");
            $('#deactivationKeyOffline').val("");
            $("#activationTab").removeClass("hide-element");
            $("#deactivationTab").addClass("hide-element");
            $("#deactivatingGen").addClass("hide-element");
            $("#deactivationGenerateBtn").removeClass("hide-element");

        }).fail(function (data) {

            $("#offlineMsgFailForDeactivation").removeClass("hide-element");
            $("#deactivateGen").removeClass("hide-element");
            $("#deactivationGenerateBtn").removeClass("hide-element");
            $("#deactivating123").addClass("hide-element");

        });
    });


});