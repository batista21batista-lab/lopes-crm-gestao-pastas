import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where, handleFirestoreError, OperationType } from '../firebase';
import { Development, Client, UserProfile } from '../types';
import { Building2, MapPin, Users, ChevronRight, Search, Filter, Loader2 as Spinner } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userProfile: UserProfile;
  onSelectDevelopment: (dev: Development, directRegister?: boolean) => void;
}

export default function CommercialView({ userProfile, onSelectDevelopment }: Props) {
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'Lançamento' | 'Pré Lançamento' | 'Breve Lançamento'>('all');

  useEffect(() => {
    // Only show active developments for brokers
    const q = query(collection(db, 'developments'), where('status', '!=', 'Inativo'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Development));
      setDevelopments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'developments');
    });
    return () => unsubscribe();
  }, []);

  const filteredDevs = developments.filter(dev => {
    const matchesSearch = dev.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         dev.developer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || dev.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8 animate-spin text-red-500" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Empreendimentos</h3>
          <p className="text-sm text-gray-500">Selecione um lançamento para gerenciar suas pastas.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
            <input 
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all w-64"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm appearance-none"
          >
            <option value="all">Todos Status</option>
            <option value="Lançamento">Lançamento</option>
            <option value="Pré Lançamento">Pré Lançamento</option>
            <option value="Breve Lançamento">Breve Lançamento</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredDevs.map((dev) => (
          <motion.div
            key={dev.id}
            whileHover={{ y: -8 }}
            onClick={() => onSelectDevelopment(dev)}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/5 transition-all overflow-hidden text-left group cursor-pointer"
          >
            <div className="h-48 relative overflow-hidden">
              <img 
                src={`https://picsum.photos/seed/${dev.id}/800/600`} 
                alt={dev.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/30">
                  {dev.status}
                </span>
              </div>
            </div>
            
            <div className="p-8">
              <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 mb-1">{dev.name}</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{dev.developer}</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="h-8 w-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="truncate flex-1">{dev.address}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="h-8 w-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="flex-1">Gerenciar Pastas</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDevelopment(dev, true);
                  }}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                >
                  Novo Cliente
                </button>
                <div className="h-10 w-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-red-500 group-hover:text-white transition-all shadow-lg shadow-transparent group-hover:shadow-red-500/20">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredDevs.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhum empreendimento encontrado.</p>
        </div>
      )}
    </div>
  );
}
