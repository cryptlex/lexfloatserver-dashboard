import { Alert } from '@cryptlex/web-components/components/alert';
import { Button } from '@cryptlex/web-components/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cryptlex/web-components/components/card';
import { Form } from '@cryptlex/web-components/components/form';
import { useAppForm } from '@cryptlex/web-components/utilities/form-hook';
import type { ApiSchema } from '@cryptlex/web-components/utilities/resources';
import { V_STRING_REQUIRED } from '@cryptlex/web-components/utilities/validators';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { client, isLoggedIn, setAccessToken } from '@/lib/api';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/login')({
    beforeLoad: () => {
        if (isLoggedIn()) throw redirect({ to: '/' });
    },
    head: ({ match }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: m['authPage.login.pageTitle'](),
                    appName: match.context.branding.appName ?? '',
                }),
            },
        ],
    }),
    component: LoginPage,
});

const DEFAULT_FULL_LOGO_URL = '/cryptlex-logo.svg';

function LoginPage() {
    const navigate = useNavigate();
    const { branding } = Route.useRouteContext();

    const login = useMutation({
        mutationFn: async (body: ApiSchema<'LoginRequest'>) => (await client.POST('/api/login', { body })).data!,
        onSuccess: data => {
            setAccessToken(data.accessToken);
            navigate({ to: '/' });
        },
    });

    const form = useAppForm({
        defaultValues: { username: '', password: '' },
        onSubmit: ({ value }) => login.mutate(value),
    });

    const logo = (
        <img
            src={branding.logoUrl ?? DEFAULT_FULL_LOGO_URL}
            alt={branding.appName ?? ''}
            className="m-0 h-12 dark:brightness-1500"
        />
    );

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center px-4">
            <div className="flex justify-center pb-input md:hidden">{logo}</div>
            <Card className="w-full md:max-w-md">
                <div className="hidden justify-center pb-input md:flex">{logo}</div>
                <CardHeader>
                    <CardTitle>{m['authPage.login.title']()}</CardTitle>
                    <CardDescription>
                        {m['authPage.login.description']({ appName: branding.appName ?? '' })}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form onSubmit={() => form.handleSubmit()} className="flex flex-col gap-icon">
                        <form.AppField name="username" validators={{ onBlur: V_STRING_REQUIRED }}>
                            {field => (
                                <field.TfTextField
                                    label={m['username.label']()}
                                    autoComplete="username"
                                    autoFocus
                                    inputClassName="bg-surface-secondary"
                                />
                            )}
                        </form.AppField>
                        <form.AppField name="password" validators={{ onBlur: V_STRING_REQUIRED }}>
                            {field => (
                                <field.TfTextField
                                    label={m['password.label']()}
                                    type="password"
                                    autoComplete="current-password"
                                    inputClassName="bg-surface-secondary"
                                />
                            )}
                        </form.AppField>

                        {login.error && <Alert variant="destructive">{login.error.message}</Alert>}

                        <Button type="submit" variant="primary" isPending={login.isPending}>
                            {m['authPage.login.action.submit']()}
                        </Button>
                    </Form>
                </CardContent>
            </Card>
        </main>
    );
}
