import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, query, handleFirestoreError, OperationType, setDoc, serverTimestamp } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { Shield, User, Mail, Calendar, CheckCircle2, AlertCircle, Plus, X, UserPlus, Power, PowerOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface Props {
  currentUser: UserProfile;
}

export default function UserManagement({ currentUser }: Props) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'corretor' as UserRole,
    cpf: '',
    phone: '',
    team: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser.uid) {
      toast.error('Você não pode alterar seu próprio nível de acesso.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success('Nível de acesso atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUser.uid) {
      toast.error('Você não pode desativar seu próprio acesso.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), { active: !currentStatus });
      toast.success(currentStatus ? 'Acesso desativado com sucesso!' : 'Acesso ativado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if email already exists in our list
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      toast.error('Este e-mail já está cadastrado.');
      return;
    }

    try {
      // Use a temporary ID or the email as ID if we don't have a UID yet
      // In Firebase Auth, the user will sign up later. 
      // We'll use a random ID for the document, and Auth.tsx will need to be updated to link them if they sign up.
      // Actually, it's better to use a random ID and then when they sign up, we check by email.
      // But for now, let's just add it.
      const tempId = `pending_${Date.now()}`;
      const profile: UserProfile = {
        uid: tempId,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        cpf: newUser.cpf,
        phone: newUser.phone,
        team: newUser.team,
        active: true,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', tempId), profile);
      toast.success('Colaborador pré-cadastrado com sucesso! Ele poderá acessar o sistema ao se cadastrar com este e-mail.');
      setIsModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        role: 'corretor',
        cpf: '',
        phone: '',
        team: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-500" />
          Gestão de Colaboradores
        </h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
        >
          <Plus className="h-4 w-4" />
          Novo Colaborador
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Nível de Acesso</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <motion.tr 
                  key={user.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "hover:bg-gray-50/50 transition-colors",
                    !user.active && "opacity-60 bg-gray-50/30"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} className="h-10 w-10 rounded-full border border-gray-200" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400">ID: {user.uid.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      user.role === 'admin' ? "bg-red-100 text-red-600" :
                      user.role === 'gestor' ? "bg-blue-100 text-blue-600" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        user.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-300"
                      )} />
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        user.active ? "text-green-600" : "text-gray-400"
                      )}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        disabled={user.uid === currentUser.uid}
                        className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all disabled:opacity-50"
                      >
                        <option value="corretor">Corretor</option>
                        <option value="gestor">Gestor</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        onClick={() => handleToggleStatus(user.uid, user.active)}
                        disabled={user.uid === currentUser.uid}
                        title={user.active ? 'Desativar Acesso' : 'Ativar Acesso'}
                        className={cn(
                          "p-2 rounded-lg transition-all disabled:opacity-50",
                          user.active 
                            ? "text-red-500 hover:bg-red-50" 
                            : "text-green-500 hover:bg-green-50"
                        )}
                      >
                        {user.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Novo Colaborador</h3>
                </div>
                <p className="text-sm text-gray-500">Cadastre um novo acesso ao sistema.</p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    required
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input 
                    required
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                    placeholder="joao@lopes.com.br"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">CPF</label>
                    <input 
                      type="text"
                      value={newUser.cpf}
                      onChange={(e) => setNewUser({ ...newUser, cpf: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Telefone</label>
                    <input 
                      type="text"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                  >
                    <option value="corretor">Corretor</option>
                    <option value="gestor">Gestor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
                  >
                    Criar Acesso
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Corretor</h4>
              <p className="text-xs text-gray-400">Acesso básico</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Cadastrar novos clientes</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Ver apenas seus clientes</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Fazer upload de documentos</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Gestor</h4>
              <p className="text-xs text-gray-400">Supervisão de equipe</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Ver todos os clientes</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Aprovar/Recusar pastas</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Ver relatórios consolidados</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Admin</h4>
              <p className="text-xs text-gray-400">Controle total</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Gerenciar níveis de acesso</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Configurar segmentos</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Acesso total ao sistema</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
