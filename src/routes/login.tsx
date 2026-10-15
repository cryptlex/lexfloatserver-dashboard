import { Alert } from '@cryptlex/web-components/components/alert';
import { Button } from '@cryptlex/web-components/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cryptlex/web-components/components/card';
import { Form } from '@cryptlex/web-components/components/form';
import { useAppForm } from '@cryptlex/web-components/utilities/form-hook';
import { V_STRING_REQUIRED } from '@cryptlex/web-components/utilities/validators';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { apiFetch, isLoggedIn, setAccessToken } from '@/lib/api';
import { m } from '@/paraglide/messages.js';
import type { AccessTokenResponse, LoginRequest } from '@/types';

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

function LoginPage() {
    const navigate = useNavigate();
    const { branding } = Route.useRouteContext();

    const login = useMutation({
        mutationFn: (body: LoginRequest) =>
            apiFetch<AccessTokenResponse>('/api/login', { method: 'POST', body: JSON.stringify(body) }),
        onSuccess: data => {
            setAccessToken(data.accessToken);
            navigate({ to: '/' });
        },
    });

    const form = useAppForm({
        defaultValues: { username: '', password: '' },
        onSubmit: ({ value }) => login.mutate(value),
    });

    return (
        <main className="flex min-h-screen w-full items-center justify-center px-4">
            <Card className="w-full md:max-w-md">
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
