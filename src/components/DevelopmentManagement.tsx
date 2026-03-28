import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { Development, DevelopmentStatus } from '../types';
import { Plus, Building2, MapPin, Calendar, CheckCircle2, XCircle, Clock, AlertTriangle, Edit3, Save, X, Loader2 as Spinner } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function DevelopmentManagement() {
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDev, setEditingDev] = useState<Development | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    developer: '',
    address: '',
    status: 'Breve Lançamento' as DevelopmentStatus,
    launchDate: '',
    mandatoryDocs: ['RG/CPF', 'Comprovante de Residência', 'IRPF'],
    optionalDocs: ['Escritura', 'Certidão de Nascimento/Casamento'],
    addressFields: {
      cep: true,
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'developments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Development));
      setDevelopments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'developments');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDev) {
        await updateDoc(doc(db, 'developments', editingDev.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Empreendimento atualizado!');
      } else {
        await addDoc(collection(db, 'developments'), {
          ...formData,
          createdAt: serverTimestamp()
        });
        toast.success('Empreendimento criado!');
      }
      setIsFormOpen(false);
      setEditingDev(null);
      setFormData({
        name: '',
        developer: '',
        address: '',
        status: 'Breve Lançamento',
        launchDate: '',
        mandatoryDocs: ['RG/CPF', 'Comprovante de Residência', 'IRPF'],
        optionalDocs: ['Escritura', 'Certidão de Nascimento/Casamento'],
        addressFields: {
          cep: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'developments');
    }
  };

  const handleEdit = (dev: Development) => {
    setEditingDev(dev);
    setFormData({
      name: dev.name,
      developer: dev.developer,
      address: dev.address,
      status: dev.status,
      launchDate: dev.launchDate || '',
      mandatoryDocs: dev.mandatoryDocs,
      optionalDocs: dev.optionalDocs,
      addressFields: {
        cep: dev.addressFields?.cep ?? true,
        street: dev.addressFields?.street ?? true,
        number: dev.addressFields?.number ?? true,
        complement: dev.addressFields?.complement ?? true,
        neighborhood: dev.addressFields?.neighborhood ?? true,
        city: dev.addressFields?.city ?? true,
        state: dev.addressFields?.state ?? true
      }
    });
    setIsFormOpen(true);
  };

  const getStatusBadge = (status: DevelopmentStatus) => {
    switch (status) {
      case 'Breve Lançamento': return <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"><Clock className="h-3 w-3" /> Breve Lançamento</span>;
      case 'Pré Lançamento': return <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Pré Lançamento</span>;
      case 'Lançamento': return <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Lançamento</span>;
      case 'Inativo': return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"><XCircle className="h-3 w-3" /> Inativo</span>;
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8 animate-spin text-red-500" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Empreendimentos</h3>
          <p className="text-sm text-gray-500">Gerencie os lançamentos da Lopes Consultoria.</p>
        </div>
        <button 
          onClick={() => { setEditingDev(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
        >
          <Plus className="h-5 w-5" />
          Novo Empreendimento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {developments.map((dev) => (
          <motion.div 
            key={dev.id}
            layoutId={dev.id}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group"
          >
            <div className="h-32 bg-gray-50 relative overflow-hidden">
              <img 
                src={`https://picsum.photos/seed/${dev.id}/800/400`} 
                alt={dev.name} 
                className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4">
                {getStatusBadge(dev.status)}
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{dev.name}</h4>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">{dev.developer}</p>
                </div>
                <button 
                  onClick={() => handleEdit(dev)}
                  className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{dev.address}</span>
                </div>
                {dev.launchDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Lançamento: {new Date(dev.launchDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400">
                      C{i}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">12 Corretores Ativos</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-white rounded-[2.5rem] shadow-2xl z-[70] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{editingDev ? 'Editar Empreendimento' : 'Novo Empreendimento'}</h3>
                  <p className="text-xs text-gray-500">Preencha os dados do lançamento.</p>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-gray-900 transition-all">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do Empreendimento</label>
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                      placeholder="Ex: Lopes Tower"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Incorporador</label>
                    <input 
                      required
                      type="text"
                      value={formData.developer}
                      onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                      placeholder="Ex: Lopes Inc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Endereço Completo</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input 
                      required
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as DevelopmentStatus })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm appearance-none"
                    >
                      <option value="Breve Lançamento">Breve Lançamento</option>
                      <option value="Pré Lançamento">Pré Lançamento</option>
                      <option value="Lançamento">Lançamento</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data de Lançamento</label>
                    <input 
                      type="date"
                      value={formData.launchDate}
                      onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Campos de Endereço Exigidos</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(formData.addressFields).map(([field, active]) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          addressFields: { ...formData.addressFields, [field]: !active }
                        })}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all",
                          active 
                            ? "bg-red-50 border-red-500 text-red-600" 
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        {field === 'cep' ? 'CEP' :
                         field === 'street' ? 'Logradouro' :
                         field === 'number' ? 'Número' :
                         field === 'complement' ? 'Complemento' :
                         field === 'neighborhood' ? 'Bairro' :
                         field === 'city' ? 'Cidade' : 'Estado'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Documentos Obrigatórios</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.mandatoryDocs.map((doc, i) => (
                      <span key={i} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold flex items-center gap-2">
                        {doc}
                        <button type="button" onClick={() => setFormData({ ...formData, mandatoryDocs: formData.mandatoryDocs.filter((_, idx) => idx !== i) })}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <button 
                      type="button"
                      onClick={() => {
                        const name = prompt('Nome do documento:');
                        if (name) setFormData({ ...formData, mandatoryDocs: [...formData.mandatoryDocs, name] });
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-[11px] font-bold hover:bg-gray-200"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              </form>

              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  <Save className="h-5 w-5" />
                  {editingDev ? 'Salvar Alterações' : 'Criar Empreendimento'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
