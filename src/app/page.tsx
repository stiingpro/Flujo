'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Moon,
  Sun,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Scale,
  LogOut,
} from 'lucide-react';
import { ImportDialog } from '@/components/import/ImportDialog';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { ExcelExport } from '@/components/export/ExcelExport';
// import { KPICards } from '@/components/dashboard/KPICards'; // Replaced by DashboardPro
// import { UtilityChart } from '@/components/dashboard/UtilityChart'; // Replaced by DashboardPro
import { PLTable } from '@/components/dashboard/PLTable';
import { SummaryTable } from '@/components/dashboard/SummaryTable';
// import { ClientRevenueCharts } from '@/components/analytics/ClientRevenueCharts'; // Replaced by DashboardPro
import { DashboardPro } from '@/components/dashboard/DashboardPro';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { MainTab } from '@/types';
import { YearCopyButton } from '@/components/dashboard/YearCopyButton';
import { useAuth } from '@/providers/AuthProvider';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import { ProfileSettingsDialog } from '@/components/profile/ProfileSettingsDialog';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

export default function DashboardPage() {
  const { filters, setFilters, toggleProjectedMode, transactions, isLoading, profile } = useFinanceStore();
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('gastos');

  // Supabase sync - loads data on mount
  useSupabaseSync();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;


  const currentYear = new Date().getFullYear();
  // Only show current year and future years (next 3 years)
  const years = Array.from({ length: 4 }, (_, i) => currentYear + i);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                <Image
                  src={profile?.logo_url || "/logo.jpg"}
                  alt="FlujoExpert Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{profile?.company_name || 'FlujoExpert'}</h1>
                <p className="text-xs text-muted-foreground">Gestión de Flujo de Caja</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <ExcelExport />
              <ImportDialog />
              <TransactionForm />
              <CategoryManager />
              <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <ProfileSettingsDialog />
              <ChangePasswordDialog />
              <Button variant="ghost" size="icon" onClick={() => signOut()} title="Cerrar Sesión">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
            {/* Year & Origin Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="year" className="text-sm text-muted-foreground whitespace-nowrap">
                  Año:
                </Label>
                <Select
                  value={filters.year.toString()}
                  onValueChange={(value) => setFilters({ year: parseInt(value, 10) })}
                >
                  <SelectTrigger id="year" className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <YearCopyButton />
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <Label htmlFor="origin" className="text-sm text-muted-foreground whitespace-nowrap">
                  Origen:
                </Label>
                <Select
                  value={filters.origin}
                  onValueChange={(value: 'all' | 'business' | 'personal') =>
                    setFilters({ origin: value })
                  }
                >
                  <SelectTrigger id="origin" className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="business">Empresa</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Projection Mode Toggle */}
            <div className="flex items-center gap-3 p-2 px-4 bg-muted/50 rounded-lg">
              <Label
                htmlFor="projection-mode"
                className="text-sm font-medium cursor-pointer select-none"
              >
                Modo Proyección
              </Label>
              <Switch
                id="projection-mode"
                checked={filters.showProjected}
                onCheckedChange={toggleProjectedMode}
              />
              <Badge variant={filters.showProjected ? 'default' : 'secondary'}>
                {filters.showProjected ? 'Proyectado + Real' : 'Solo Confirmado'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MainTab)}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="h-12">
              <TabsTrigger value="gastos" className="h-10 px-6 gap-2">
                <TrendingDown className="h-4 w-4 text-expense" />
                Gastos
              </TabsTrigger>
              <TabsTrigger value="ingresos" className="h-10 px-6 gap-2">
                <TrendingUp className="h-4 w-4 text-income" />
                Ingresos
              </TabsTrigger>
              <TabsTrigger value="resumen" className="h-10 px-6 gap-2">
                <Scale className="h-4 w-4 text-blue-600" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="h-10 px-6 gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
            </TabsList>

            <p className="text-sm text-muted-foreground">
              {transactions.length > 0
                ? `${transactions.length} movimientos registrados`
                : 'Importa un archivo Excel para comenzar'}
            </p>
          </div>

          {/* Tab: Gastos */}
          <TabsContent value="gastos" className="mt-0 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Gastos {filters.year}</h2>
                <p className="text-sm text-muted-foreground">
                  Gestiona todos tus gastos por categoría
                </p>
              </div>
            </div>
            <PLTable filterType="expense" />
          </TabsContent>

          {/* Tab: Ingresos */}
          <TabsContent value="ingresos" className="mt-0 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ingresos {filters.year}</h2>
                <p className="text-sm text-muted-foreground">
                  Gestiona todos tus ingresos por categoría
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="gap-1 bg-green-50 border-green-200 text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Pagado
                </Badge>
                <Badge variant="outline" className="gap-1 bg-amber-50 border-amber-200 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Por Cobrar
                </Badge>
              </div>
            </div>
            <PLTable filterType="income" />
          </TabsContent>

          {/* Tab: Resumen */}
          <TabsContent value="resumen" className="mt-0 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Resumen {filters.year}</h2>
                <p className="text-sm text-muted-foreground">
                  Balance mensual de ingresos y gastos
                </p>
              </div>
            </div>
            <SummaryTable />
          </TabsContent>

          {/* Tab: Dashboard */}
          <TabsContent value="dashboard" className="mt-0 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Dashboard {filters.year}</h2>
                <p className="text-sm text-muted-foreground">
                  Visualización gráfica del flujo de caja
                </p>
              </div>
            </div>

            <DashboardPro />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© {currentYear} FlujoGlobal</p>
            <p>Gestión inteligente de flujo de caja</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
