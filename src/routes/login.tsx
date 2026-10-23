import { Alert } from '@cryptlex/web-components/components/alert';
import { Button } from '@cryptlex/web-components/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cryptlex/web-components/components/card';
import { Form } from '@cryptlex/web-components/components/form';
import { useAppForm } from '@cryptlex/web-components/utilities/form-hook';
import type { ApiSchema } from '@cryptlex/web-components/utilities/resources';
import { V_STRING_REQUIRED } from '@cryptlex/web-components/utilities/validators';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ApiError, client, isLoggedIn, setAccessToken } from '@/lib/api';
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

const DEFAULT_LOGO_URL = '/cryptlex-icon-logo.svg';

function LoginPage() {
    const navigate = useNavigate();
    const { branding } = Route.useRouteContext();

    const login = useMutation({
        mutationFn: async (body: ApiSchema<'LoginRequest'>) => (await client.POST('/api/login', { body }))?.data,
        onSuccess: data => {
            if (!data) return;
            setAccessToken(data.accessToken);
            navigate({ to: '/' });
        },
    });

    const form = useAppForm({
        defaultValues: { username: '', password: '' },
        onSubmit: ({ value }) => login.mutate(value),
    });

    // Same icon and name as the sidebar header.
    const brand = (
        <div className="flex items-center gap-2 font-semibold text-lg">
            <img src={branding.logoUrl ?? DEFAULT_LOGO_URL} alt="" className="size-8" />
            {branding.appName}
        </div>
    );

    // The API answers a wrong username or password with a 400; don't say which of the two is wrong.
    const loginError =
        login.error instanceof ApiError && login.error.status === 400
            ? m['authPage.login.error.invalidCredentials']()
            : login.error?.message;

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center px-4">
            <div className="flex justify-center pb-input md:hidden">{brand}</div>
            <Card className="w-full md:max-w-md">
                <div className="hidden justify-center pb-input md:flex">{brand}</div>
                <CardHeader>
                    <CardTitle>{m['authPage.login.title']()}</CardTitle>
                    <CardDescription>{m['authPage.login.description']()}</CardDescription>
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

                        {loginError && <Alert variant="destructive">{loginError}</Alert>}

                        <Button type="submit" variant="primary" isPending={login.isPending}>
                            {m['authPage.login.action.submit']()}
                        </Button>
                    </Form>
                </CardContent>
            </Card>
        </main>
    );
}
