import React from 'react';
import { Client, Development } from '../types';
import { db, deleteDoc, doc, updateDoc } from '../firebase';
import { toast } from 'sonner';
import { Edit2, Trash2, Eye, MoreVertical, CheckCircle2, Clock, AlertTriangle, XCircle, FileText, TrendingUp, FileUp } from 'lucide-react';
import { formatCurrency, formatTaxId, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface Props {
  clients: Client[];
  segments: Development[];
  onEdit: (client: Client) => void;
  onAttachDocument?: (client: Client) => void;
}

export default function ClientList({ clients, segments, onEdit, onAttachDocument }: Props) {
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
      toast.success('Cliente excluído com sucesso');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    }
  };

  const updateStatus = async (id: string, status: Client['status']) => {
    try {
      await updateDoc(doc(db, 'clients', id), { status });
      toast.success(`Status atualizado para: ${status}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
        <p className="text-sm text-gray-400">Comece cadastrando um novo cliente ou importando uma lista.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segmento</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Renda</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((client, index) => (
              <motion.tr 
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold",
                      client.type === 'PF' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    )}>
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                      <p className="text-xs text-gray-500">{client.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600 font-mono">{formatTaxId(client.taxId, client.type)}</p>
                  <p className="text-xs text-gray-400 capitalize">{client.type}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase">
                    {segments.find(s => s.id === client.developmentId)?.name || client.developmentId}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(client.income)}</p>
                  <p className="text-xs text-gray-400">Mensal</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <StatusBadge status={client.status} />
                    {client.documentUrls && client.documentUrls.length > 0 && (
                      <div className="flex gap-1">
                        {Object.values(client.documents?.status || {}).filter(s => s === 'approved').length > 0 && (
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Docs Aprovados" />
                        )}
                        {Object.values(client.documents?.status || {}).filter(s => s === 'rejected').length > 0 && (
                          <div className="h-1.5 w-1.5 rounded-full bg-red-500" title="Docs Recusados" />
                        )}
                        {Object.values(client.documents?.status || {}).filter(s => s === 'pending').length > 0 && (
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Docs Pendentes" />
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(client)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {onAttachDocument && (
                      <button 
                        onClick={() => onAttachDocument(client)}
                        className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Anexar Documento"
                      >
                        <FileUp className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => setDeleteConfirmId(client.id!)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="relative group/menu">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-30 hidden group-hover/menu:block">
                        <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alterar Status</p>
                        <StatusMenuItem label="Aguardando Validação" onClick={() => updateStatus(client.id!, 'Aguardando Validação')} icon={<Clock className="h-3 w-3 text-blue-500" />} />
                        <StatusMenuItem label="Pendente" onClick={() => updateStatus(client.id!, 'pendente')} icon={<Clock className="h-3 w-3 text-amber-500" />} />
                        <StatusMenuItem label="Em Análise" onClick={() => updateStatus(client.id!, 'em análise')} icon={<AlertTriangle className="h-3 w-3 text-indigo-500" />} />
                        <StatusMenuItem label="Aprovada" onClick={() => updateStatus(client.id!, 'aprovada')} icon={<CheckCircle2 className="h-3 w-3 text-emerald-500" />} />
                        <StatusMenuItem label="Reprovada" onClick={() => updateStatus(client.id!, 'reprovada')} icon={<XCircle className="h-3 w-3 text-red-500" />} />
                        <StatusMenuItem label="Convertida" onClick={() => updateStatus(client.id!, 'convertida')} icon={<TrendingUp className="h-3 w-3 text-red-600" />} />
                      </div>
                    </div>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e todos os dados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Client['status'] }) {
  const config = {
    'Aguardando Validação': { color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-3 w-3" /> },
    'completa': { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
    'pendente': { color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
    'em análise': { color: 'bg-indigo-100 text-indigo-700', icon: <AlertTriangle className="h-3 w-3" /> },
    'aprovada': { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
    'reprovada': { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
    'convertida': { color: 'bg-red-600 text-white', icon: <TrendingUp className="h-3 w-3" /> },
  };

  const { color, icon } = config[status] || config['pendente'];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize", color)}>
      {icon}
      {status}
    </span>
  );
}

function StatusMenuItem({ label, onClick, icon }: { label: string, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
