import {
    BreadcrumbLink as AriaBreadcrumbLink,
    Breadcrumbs as AriaBreadcrumbs,
    BreadcrumbItem,
    BreadcrumbSeparator,
} from '@cryptlex/web-components/components/breadcrumbs';
import { createLink, type RegisteredRouter, useMatches, type ValidateLinkOptions } from '@tanstack/react-router';
import { Fragment } from 'react';

const BreadcrumbLink = createLink(AriaBreadcrumbLink);

export type RouterBreadcrumbProps = ValidateLinkOptions<RegisteredRouter, unknown> & {
    label: string;
};

/**
 * Return this in beforeLoad
 */
export function routerBreadcrumbs(breadcrumbs: RouterBreadcrumbProps[]) {
    return { breadcrumbs };
}

export function Breadcrumbs() {
    const matches = useMatches();
    const routes = matches.flatMap(match => {
        const context = match.context as { breadcrumbs?: RouterBreadcrumbProps[] };
        return context.breadcrumbs ?? [];
    });

    if (routes.length === 0) {
        return null;
    }

    return (
        <AriaBreadcrumbs className="ms-3">
            {routes.map((item, index) => (
                <Fragment key={item.to}>
                    <BreadcrumbItem className="animate-in slide-in-from-left-10">
                        <BreadcrumbLink className={'select-none'} to={item.to} isDisabled={index === routes.length - 1}>
                            {item.label}
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {!(index === routes.length - 1) && <BreadcrumbSeparator />}
                </Fragment>
            ))}
        </AriaBreadcrumbs>
    );
}
