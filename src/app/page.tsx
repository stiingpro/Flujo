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
import { ImportWizardModal } from '@/components/import/ImportWizardModal';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { ExcelExport } from '@/components/export/ExcelExport';
import { PDFExportButton } from '@/components/reports/PDFExportButton';
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
import { CompanyBranding } from '@/components/profile/CompanyBranding';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { DashboardV2 } from '@/components/dashboard-v2/DashboardV2';

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
  // Only show current year and future years (next 2 years -> Total 3: 2026, 2027, 2028)
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);

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
                  src="/logo-new.png"
                  alt="Radar Financiero Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Radar Financiero</h1>
                <p className="text-xs text-muted-foreground">Gestión de Flujo de Caja</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <ExcelExport />
              <PDFExportButton />
              <ImportWizardModal />
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
      </header >

      {/* Filters Bar */}
      < div className="bg-white border-b" >
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
                <ProfileSettingsDialog
                  customTrigger={<CompanyBranding />}
                />
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
      </div >

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardV2 />
      </main>

      {/* Footer */}
      < footer className="border-t bg-white mt-12" >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© {currentYear} Radar Financiero</p>
            <p>Gestión inteligente de flujo de caja</p>
          </div>
        </div>
      </footer >
    </div >
  );
}
