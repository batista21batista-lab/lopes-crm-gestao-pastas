import { useMemo } from 'react';
import { Client, Development } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, XCircle, FileText, TrendingUp, Users, Target, BarChart3 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';

interface Props {
  clients: Client[];
  segments: Development[];
}

const COLORS = {
  'completa': '#3b82f6',
  'pendente': '#f59e0b',
  'Aguardando Validação': '#f59e0b',
  'em análise': '#6366f1',
  'aprovada': '#10b981',
  'reprovada': '#ef4444',
  'convertida': '#ec1847',
};

export default function Reports({ clients, segments }: Props) {
  const statusData = useMemo(() => {
    const counts = clients.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [clients]);

  const conversionData = useMemo(() => {
    return segments.map(s => ({
      name: s.name,
      meta: s.meta || 0,
      realizado: s.realized || 0,
    }));
  }, [segments]);

  const segmentData = useMemo(() => {
    const counts = clients.reduce((acc, c) => {
      const dev = segments.find(s => s.id === c.developmentId);
      const name = dev ? dev.name : 'Outros';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [clients, segments]);

  const pendingAlerts = useMemo(() => {
    return clients.filter(c => c.status === 'pendente' || c.status === 'em análise' || c.status === 'Aguardando Validação').slice(0, 5);
  }, [clients]);

  const docStatusData = useMemo(() => {
    const counts = { approved: 0, rejected: 0, pending: 0 };
    clients.forEach(c => {
      if (c.documents.status) {
        Object.values(c.documents.status).forEach(status => {
          if (status === 'approved') counts.approved++;
          else if (status === 'rejected') counts.rejected++;
          else counts.pending++;
        });
      }
    });
    return [
      { name: 'Aprovados', value: counts.approved, color: '#10b981' },
      { name: 'Recusados', value: counts.rejected, color: '#ef4444' },
      { name: 'Pendentes', value: counts.pending, color: '#f59e0b' },
    ];
  }, [clients]);

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">Nenhum dado disponível para relatórios</p>
        <p className="text-sm text-gray-400">Cadastre clientes para visualizar as estatísticas.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Status Distribution */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-red-500" /> Distribuição por Status
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#ccc'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segment Distribution */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-red-500" /> Clientes por Empreendimento
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={segmentData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" fill="#ec1847" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Document Status Distribution */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <FileText className="h-5 w-5 text-red-500" /> Status de Documentos (Geral)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={docStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {docStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Meta x Realizado */}
      <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Target className="h-5 w-5 text-red-500" /> Comparativo Meta x Realizado
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip cursor={{ fill: '#f9fafb' }} />
              <Legend />
              <Bar dataKey="meta" name="Meta" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill="#ec1847" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending Alerts */}
      <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Alertas de Documentação Pendente
          </h3>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top 5 Prioridades</span>
        </div>
        <div className="space-y-4">
          {pendingAlerts.map((client, i) => (
            <motion.div 
              key={client.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold",
                  client.type === 'PF' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                )}>
                  {client.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-500">Empreendimento: {segments.find(s => s.id === client.developmentId)?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Status: {client.status}</p>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>Cadastrado em: {new Date(client.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
