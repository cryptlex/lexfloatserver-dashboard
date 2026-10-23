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
import { useNavigate } from '@tanstack/react-router';
import { ApiError, client } from '@/lib/api';
import { m } from '@/paraglide/messages.js';

type Product = ApiSchema<'Product'>;

/** Deactivate button that asks the user to retype the license key, then deactivates an online-activated product's license. */
export function DeactivateDialog({ product, licenseKey }: { product: Product; licenseKey: string }) {
    return (
        <DialogTrigger>
            <Button variant="destructive_neutral">{m['productsPage.action.deactivate']()}</Button>
            <DialogOverlay>
                <DialogContent role="alertdialog">
                    {({ close }) => <DeactivateConfirm product={product} licenseKey={licenseKey} onClose={close} />}
                </DialogContent>
            </DialogOverlay>
        </DialogTrigger>
    );
}

function DeactivateConfirm({
    product,
    licenseKey,
    onClose,
}: {
    product: Product;
    licenseKey: string;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const deactivate = useMutation({
        mutationFn: async (licenseKey: string) =>
            (
                await client.POST('/api/v4/products/{productId}/server/deactivate', {
                    params: { path: { productId: product.id } },
                    body: { licenseKey },
                })
            ).data,
        onSuccess: () => {
            toast({
                variant: 'success',
                title: m['productsPage.deactivateDialog.toast.success'](),
            });
            queryClient.invalidateQueries({ queryKey: ['get'] });
            onClose();
            navigate({ to: '/products' });
        },
    });

    const form = useAppForm({
        defaultValues: { licenseKey: '' },
        onSubmit: ({ value }) => deactivate.mutate(value.licenseKey.trim()),
    });

    const error = deactivate.error;
    // The server refuses while offline devices still hold seats; say what to do instead of echoing the code.
    const errorMessage =
        error instanceof ApiError && error.code === 'OUTSTANDING_OFFLINE_LICENSES'
            ? m['productsPage.deactivateDialog.error.outstandingOffline']()
            : error?.message;

    return (
        <Form onSubmit={() => form.handleSubmit()} className="contents">
            <DialogHeader>
                <DialogTitle>{m['productsPage.deactivateDialog.title']()}</DialogTitle>
                <DialogDescription>
                    {m['productsPage.deactivateDialog.description']({ product: product.displayName })}
                </DialogDescription>
            </DialogHeader>
            <DialogBody className="gap-icon">
                {/* Retyping the key adds friction so a seat-revoking action isn't one stray click away. */}
                <form.AppField
                    name="licenseKey"
                    validators={{
                        onBlur: V_STRING_REQUIRED,
                        onSubmit: ({ value }) =>
                            value.trim() === licenseKey
                                ? undefined
                                : { message: m['productsPage.deactivateDialog.error.keyMismatch']() },
                    }}
                >
                    {field => (
                        <field.TfTextField
                            label={m['productsPage.deactivateDialog.confirmLabel']()}
                            autoComplete="off"
                            autoFocus
                        />
                    )}
                </form.AppField>
                {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
            </DialogBody>
            <DialogFooter>
                <Button onPress={onClose} isDisabled={deactivate.isPending}>
                    {m['common.action.cancel']()}
                </Button>
                <Button
                    type="submit"
                    variant="destructive"
                    isDisabled={deactivate.isPending}
                    isPending={deactivate.isPending}
                >
                    {m['productsPage.action.deactivate']()}
                </Button>
            </DialogFooter>
        </Form>
    );
}
