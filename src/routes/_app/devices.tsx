import { createFileRoute } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_app/devices')({
    head: ({ match }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: m['devicesPage.pageTitle'](),
                    appName: match.context.branding.appName ?? '',
                }),
            },
        ],
    }),
    component: () => <h1 className="heading-3">{m['devicesPage.title']()}</h1>,
});
