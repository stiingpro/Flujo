'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Register state
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success('Bienvenido de nuevo');
            router.push('/');
        } catch (error: any) {
            toast.error(error.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error, data } = await supabase.auth.signUp({
                email: regEmail,
                password: regPassword,
            });

            if (error) throw error;

            if (data.session) {
                toast.success('Cuenta creada exitosamente');
                router.push('/');
            } else {
                toast.success('Revisa tu email para confirmar la cuenta', {
                    description: "Hemos enviado un enlace de confirmación."
                });
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al registrarse');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">FlujoGlobal</CardTitle>
                    <CardDescription>
                        Ingresa para gestionar tus finanzas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">Ingresar</TabsTrigger>
                            <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login" className="space-y-4">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Iniciar Sesión
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="register" className="space-y-4">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">Email</Label>
                                    <Input
                                        id="reg-email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        required
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Contraseña</Label>
                                    <Input
                                        id="reg-password"
                                        type="password"
                                        required
                                        minLength={6}
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        className="bg-white"
                                    />
                                    <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Registrarse
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
