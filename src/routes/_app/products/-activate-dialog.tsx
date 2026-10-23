import { Alert } from '@cryptlex/web-components/components/alert';
import { Button } from '@cryptlex/web-components/components/button';
import {
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
    DialogTrigger,
} from '@cryptlex/web-components/components/dialog';
import { Form } from '@cryptlex/web-components/components/form';
import { toast } from '@cryptlex/web-components/components/toast';
import { useAppForm } from '@cryptlex/web-components/utilities/form-hook';
import type { ApiSchema } from '@cryptlex/web-components/utilities/resources';
import { V_STRING_REQUIRED } from '@cryptlex/web-components/utilities/validators';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { client } from '@/lib/api';
import { m } from '@/paraglide/messages.js';

type Product = ApiSchema<'Product'>;

/** Activate button that opens a dialog asking for the license key, then activates the product online. */
export function ActivateDialog({ product }: { product: Product }) {
    return (
        <DialogTrigger>
            <Button variant="primary">{m['productsPage.action.activateLicense']()}</Button>
            <DialogOverlay>
                <DialogContent>{({ close }) => <ActivateForm product={product} onClose={close} />}</DialogContent>
            </DialogOverlay>
        </DialogTrigger>
    );
}

function ActivateForm({ product, onClose }: { product: Product; onClose: () => void }) {
    const queryClient = useQueryClient();
    const { branding } = useRouteContext({ from: '__root__' });

    const activate = useMutation({
        mutationFn: async (body: ApiSchema<'ServerLicenseActivationRequest'>) =>
            (
                await client.POST('/api/v4/products/{productId}/server/activate', {
                    params: { path: { productId: product.id } },
                    body,
                })
            ).data,
        onSuccess: () => {
            toast({
                variant: 'success',
                title: m['productsPage.activateDialog.toast.success']({ product: product.displayName }),
            });
            queryClient.invalidateQueries({ queryKey: ['get'] });
            onClose();
        },
    });

    const form = useAppForm({
        defaultValues: { licenseKey: '' },
        onSubmit: ({ value }) => activate.mutate({ licenseKey: value.licenseKey.trim() }),
    });

    return (
        <Form onSubmit={() => form.handleSubmit()} className="contents">
            <DialogHeader>
                <DialogTitle>{m['productsPage.activateDialog.title']({ product: product.displayName })}</DialogTitle>
                <DialogDescription>
                    {m['productsPage.activateDialog.description']({ appName: branding.appName ?? '' })}
                </DialogDescription>
            </DialogHeader>
            <DialogBody className="gap-icon">
                <form.AppField name="licenseKey" validators={{ onBlur: V_STRING_REQUIRED }}>
                    {field => <field.TfTextField label={m['key.label']()} autoComplete="off" autoFocus />}
                </form.AppField>
                {/* Errors stay in the dialog so the user can fix the key and retry without retyping it. */}
                {activate.error && <Alert variant="destructive">{activate.error.message}</Alert>}
            </DialogBody>
            <DialogFooter>
                <Button onPress={onClose} isDisabled={activate.isPending}>
                    {m['common.action.cancel']()}
                </Button>
                <Button type="submit" variant="primary" isDisabled={activate.isPending} isPending={activate.isPending}>
                    {m['productsPage.action.activate']()}
                </Button>
            </DialogFooter>
        </Form>
    );
}
