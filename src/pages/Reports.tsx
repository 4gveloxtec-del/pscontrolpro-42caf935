import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, TrendingUp, Server, Calendar, CheckCircle } from 'lucide-react';
import { startOfMonth, isBefore, startOfToday } from 'date-fns';

export default function Reports() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const today = startOfToday();
  const monthStart = startOfMonth(today);

  const { data: stats } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const [profilesRes, clientsRes, serversRes] = await Promise.all([
        supabase.from('profiles').select('id, subscription_expires_at, is_permanent'),
        supabase.from('clients').select('id, plan_price, premium_price, is_paid, renewed_at, expiration_date, is_archived'),
        supabase.from('servers').select('id, monthly_cost, is_active'),
      ]);

      const profiles = profilesRes.data || [];
      const allClients = clientsRes.data || [];
      const servers = serversRes.data || [];

      // Filter only active (non-archived) clients
      const clients = allClients.filter(c => !c.is_archived);

      // Paid clients only
      const paidClients = clients.filter(c => c.is_paid);

      // CORRECTED: Total revenue = only PAID clients' plan_price + premium_price
      const totalRevenue = paidClients.reduce((sum, c) => sum + (c.plan_price || 0) + (c.premium_price || 0), 0);
      
      // Monthly revenue = only clients renewed THIS MONTH with valid expiration
      const clientsRenewedThisMonth = clients.filter(c => {
        if (!c.renewed_at || !c.is_paid) return false;
        const renewedDate = new Date(c.renewed_at);
        return !isBefore(renewedDate, monthStart) && !isBefore(new Date(c.expiration_date), today);
      });
      const monthlyRevenue = clientsRenewedThisMonth.reduce((sum, c) => sum + (c.plan_price || 0) + (c.premium_price || 0), 0);

      const totalServerCosts = servers
        .filter(s => s.is_active)
        .reduce((sum, s) => sum + (s.monthly_cost || 0), 0);

      return {
        totalSellers: profiles.length,
        totalClients: clients.length,
        totalRevenue,
        monthlyRevenue,
        renewedThisMonth: clientsRenewedThisMonth.length,
        totalServerCosts,
        paidClients: paidClients.length,
        unpaidClients: clients.filter(c => !c.is_paid).length,
        activeServers: servers.filter(s => s.is_active).length,
      };
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSellers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.paidClients || 0} pagos / {stats?.unpaidClients || 0} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {(stats?.monthlyRevenue || 0).toFixed(2).replace('.', ',')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.renewedThisMonth || 0} renovações este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custos de Servidores</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              R$ {(stats?.totalServerCosts || 0).toFixed(2).replace('.', ',')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeServers || 0} servidores ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Lucro Mensal Estimado
            </CardTitle>
            <CardDescription>Receita do mês menos custos de servidores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              R$ {((stats?.monthlyRevenue || 0) - (stats?.totalServerCosts || 0)).toFixed(2).replace('.', ',')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Receita Total (Clientes Pagos)
            </CardTitle>
            <CardDescription>Soma de todos os planos de clientes ativos e pagos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-success">
              R$ {(stats?.totalRevenue || 0).toFixed(2).replace('.', ',')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.paidClients || 0} clientes pagos × valor médio dos planos
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Funcionalidades Futuras
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Gráficos de evolução mensal</li>
            <li>Relatório por vendedor</li>
            <li>Exportação para Excel/PDF</li>
            <li>Métricas de conversão</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}