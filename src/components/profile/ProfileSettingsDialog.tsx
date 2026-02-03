'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { supabase } from '@/lib/supabase';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Loader2, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface ProfileSettingsDialogProps {
    customTrigger?: React.ReactNode;
}

export function ProfileSettingsDialog({ customTrigger }: ProfileSettingsDialogProps) {
    const { user } = useAuth();
    const { profile, setProfile, updateProfile } = useFinanceStore();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Fallback if profile doesn't exist locally perfectly yet
    const currentLogo = profile?.logo_url || null;
    const companyName = profile?.company_name || '';
    const fullName = profile?.full_name || '';
    const email = profile?.contact_email || '';
    const phone = profile?.phone || '';
    const country = profile?.country || '';

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Debes seleccionar una imagen.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}/logo.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            // Force cache bust to ensure user sees new image immediately
            const publicUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

            // 3. Upsert into profiles table
            const updates = {
                id: user!.id,
                logo_url: publicUrlWithTimestamp,
                updated_at: new Date().toISOString(),
            };

            const { error: dbError } = await supabase
                .from('profiles')
                .upsert(updates)
                .select()
                .single();

            if (dbError) throw dbError;

            // 4. Update local state
            if (profile) {
                updateProfile({ logo_url: publicUrlWithTimestamp });
            } else {
                setProfile(updates);
            }

            toast.success('Logo actualizado correctamente');

        } catch (error: any) {
            console.error('Error uploading logo:', error);
            toast.error('Error al subir imagen: ' + (error.message || 'Desconocido'));
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target as HTMLFormElement);

        const updates = {
            id: user!.id,
            company_name: formData.get('companyName') as string,
            full_name: formData.get('fullName') as string,
            contact_email: formData.get('contactEmail') as string,
            phone: formData.get('phone') as string,
            country: formData.get('country') as string,
            updated_at: new Date().toISOString(),
        };

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            if (profile) {
                updateProfile(updates);
            } else {
                setProfile({ ...updates, logo_url: currentLogo || undefined });
            }

            toast.success('Perfil actualizado');
            setIsOpen(false);
        } catch (error: any) {
            toast.error('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {customTrigger ? (
                    customTrigger
                ) : (
                    <Button variant="ghost" size="icon" title="Configuración de Perfil">
                        <Settings className="h-5 w-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configuración de Perfil</DialogTitle>
                    <DialogDescription>
                        Personaliza los datos de tu cuenta y empresa.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Logo Upload Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 group hover:border-blue-500 transition-colors">
                            {currentLogo ? (
                                <Image
                                    src={currentLogo}
                                    alt="Logo Empresa"
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <Upload className="h-8 w-8 text-gray-400" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-xs text-white font-medium">Cambiar</p>
                            </div>
                            <Input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                        </div>
                        <div className="text-center">
                            <Label className="text-sm font-medium">Logo de Marca</Label>
                        </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nombre de Fantasía (Empresa)</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                defaultValue={companyName}
                                placeholder="Ej. STIING Ingeniería"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nombre de Usuario</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    defaultValue={fullName}
                                    placeholder="Tu Nombre"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">País</Label>
                                <Input
                                    id="country"
                                    name="country"
                                    defaultValue={country}
                                    placeholder="Ej. Chile"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactEmail">Correo de Contacto</Label>
                                <Input
                                    id="contactEmail"
                                    name="contactEmail"
                                    type="email"
                                    defaultValue={email}
                                    placeholder="contacto@empresa.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Número de Contacto</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    defaultValue={phone}
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
