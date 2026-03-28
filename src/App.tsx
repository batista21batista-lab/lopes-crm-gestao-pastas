import { useState, useEffect, ReactNode, useMemo } from 'react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, onSnapshot, query, where, doc, setDoc, updateDoc, addDoc, getDoc, serverTimestamp, handleFirestoreError, OperationType } from './firebase';
import { Client, View, Development, UserProfile, UserRole } from './types';
import { LogIn, LogOut, Plus, Search, FileUp, BarChart3, Users, LayoutDashboard, MessageSquare, AlertTriangle, CheckCircle2, Clock, XCircle, FileText, ChevronRight, Menu, X, Download, Filter, TrendingUp, Shield, Building2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { formatCurrency, formatTaxId, cn } from './lib/utils';
import * as XLSX from 'xlsx';

// Components
import ClientForm from './components/ClientForm';
import ClientList from './components/ClientList';
import ImportExcel from './components/ImportExcel';
import Reports from './components/Reports';
import GeminiChat from './components/GeminiChat';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import Home from './components/Home';
import Auth from './components/Auth';
import DevelopmentManagement from './components/DevelopmentManagement';
import CommercialView from './components/CommercialView';
import DocumentOCR from './components/DocumentOCR';
import { Settings as SettingsIcon } from 'lucide-react';

const LOPES_RED = '#ec1847';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('home');
  const [authType, setAuthType] = useState<'admin' | 'commercial' | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [selectedDevelopment, setSelectedDevelopment] = useState<Development | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [quickAttachClient, setQuickAttachClient] = useState<Client | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({ appName: 'Lopes CRM', primaryColor: '#ec1847', logoUrl: '' });

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const recentRejections = useMemo(() => {
    const rejections: { clientId: string, clientName: string, docName: string, reason: string, date: any }[] = [];
    clients.forEach(c => {
      if (c.documents.status) {
        Object.entries(c.documents.status).forEach(([docName, status]) => {
          if (status === 'rejected') {
            rejections.push({
              clientId: c.id!,
              clientName: c.name,
              docName,
              reason: c.documents.rejectionReasons?.[docName] || 'Não especificado',
              date: c.updatedAt || c.createdAt
            });
          }
        });
      }
    });
    return rejections.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).slice(0, 5);
  }, [clients]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', u.uid));
          if (profileDoc.exists()) {
            const profile = profileDoc.data() as UserProfile;
            setUserProfile(profile);
            if (profile.role === 'admin' || profile.role === 'gestor') {
              setView('dashboard');
            } else {
              setView('developments');
            }
          } else {
            // This case is handled by Auth.tsx for email/password
            // For Google login, we might still need it
            const isAdmin = u.email === 'batista21batista@gmail.com';
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              name: u.displayName || 'Usuário',
              role: isAdmin ? 'admin' : 'corretor',
              active: true,
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', u.uid), newProfile);
            setUserProfile(newProfile);
            setView(isAdmin ? 'dashboard' : 'developments');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setUserProfile(null);
        setView('home');
        setAuthType(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'config'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAppSettings(data as any);
          if (data.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', data.primaryColor);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (!user || !userProfile) return;

    // Role-based query
    let q = query(collection(db, 'clients'));
    if (userProfile.role === 'corretor') {
      q = query(collection(db, 'clients'), where('createdBy', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    // Load developments
    const qDev = query(collection(db, 'developments'));
    const unsubDev = onSnapshot(qDev, (snapshot) => {
      const loadedDevs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Development));
      setDevelopments(loadedDevs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'developments');
    });

    return () => {
      unsubscribe();
      unsubDev();
    };
  }, [user, userProfile]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Bem-vindo à Lopes Consultoria!');
    } catch (error) {
      toast.error('Erro ao fazer login');
    }
  };

  const handleLogout = () => {
    signOut(auth);
    toast.info('Sessão encerrada');
  };

  const navigateToEdit = (client: Client) => {
    setEditingClient(client);
    setView('edit');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    if (authType) {
      return <Auth type={authType} onBack={() => setAuthType(null)} onSuccess={() => {}} />;
    }
    return <Home onSelectAccess={setAuthType} appName={appSettings.appName} logoUrl={appSettings.logoUrl} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-right" richColors />
      
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="relative flex flex-col bg-white border-r border-gray-200 shadow-sm z-20"
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              {appSettings.logoUrl ? (
                <img src={appSettings.logoUrl} alt="Logo" className="h-8 object-contain" />
              ) : (
                <span className="text-xl font-bold tracking-tight text-[#ec1847]">{appSettings.appName.split(' ')[0].toUpperCase()}</span>
              )}
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {(userProfile?.role === 'admin' || userProfile?.role === 'gestor') ? (
            <>
              <NavItem 
                active={view === 'dashboard'} 
                onClick={() => setView('dashboard')} 
                icon={<LayoutDashboard />} 
                label="Dashboard" 
                collapsed={!isSidebarOpen} 
              />
              <NavItem 
                active={view === 'developments'} 
                onClick={() => setView('developments')} 
                icon={<Building2 />} 
                label="Empreendimentos" 
                collapsed={!isSidebarOpen} 
              />
              <NavItem 
                active={view === 'reports'} 
                onClick={() => setView('reports')} 
                icon={<BarChart3 />} 
                label="Relatórios" 
                collapsed={!isSidebarOpen} 
              />
              <NavItem 
                active={view === 'register'} 
                onClick={() => { setEditingClient(null); setView('register'); }} 
                icon={<Plus />} 
                label="Novo Cliente" 
                collapsed={!isSidebarOpen} 
              />
              <NavItem 
                active={view === 'import'} 
                onClick={() => setView('import')} 
                icon={<FileUp />} 
                label="Importar Excel" 
                collapsed={!isSidebarOpen} 
              />
              {userProfile?.role === 'admin' && (
                <>
                  <NavItem 
                    active={view === 'users'} 
                    onClick={() => setView('users')} 
                    icon={<Shield className="h-5 w-5" />} 
                    label="Colaboradores" 
                    collapsed={!isSidebarOpen} 
                  />
                  <NavItem 
                    active={view === 'settings'} 
                    onClick={() => setView('settings')} 
                    icon={<SettingsIcon className="h-5 w-5" />} 
                    label="Configurações" 
                    collapsed={!isSidebarOpen} 
                  />
                </>
              )}
            </>
          ) : (
            <>
              <NavItem 
                active={view === 'developments'} 
                onClick={() => { setSelectedDevelopment(null); setView('developments'); }} 
                icon={<Building2 />} 
                label="Empreendimentos" 
                collapsed={!isSidebarOpen} 
              />
              {selectedDevelopment && (
                <>
                  <NavItem 
                    active={view === 'dashboard'} 
                    onClick={() => setView('dashboard')} 
                    icon={<Users />} 
                    label="Minhas Pastas" 
                    collapsed={!isSidebarOpen} 
                  />
                  <NavItem 
                    active={view === 'register'} 
                    onClick={() => { setEditingClient(null); setView('register'); }} 
                    icon={<Plus />} 
                    label="Novo Cliente" 
                    collapsed={!isSidebarOpen} 
                  />
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
            <div className="relative">
              <img src={user.photoURL} alt={user.displayName} className="h-8 w-8 rounded-full border border-gray-200" />
              <div className={cn(
                "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white",
                userProfile?.role === 'admin' ? "bg-red-500" :
                userProfile?.role === 'gestor' ? "bg-blue-500" :
                "bg-gray-400"
              )} />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user.displayName}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{userProfile?.role}</p>
              </div>
            )}
            {isSidebarOpen && (
              <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-500">
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <h2 className="text-lg font-semibold text-gray-800 capitalize">
            {view === 'dashboard' ? (selectedDevelopment ? `Pastas: ${selectedDevelopment.name}` : 'Painel de Controle') : 
             view === 'developments' ? 'Empreendimentos' :
             view === 'register' ? 'Cadastro de Cliente' :
             view === 'edit' ? 'Editar Cliente' :
             view === 'import' ? 'Importação de Dados' : 
             view === 'users' ? 'Gestão de Colaboradores' : 
             view === 'settings' ? 'Configurações' : 'Análise e Relatórios'}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou CPF/CNPJ..." 
                className="pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all w-64 lg:w-96"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all relative"
              >
                <MessageSquare className="h-5 w-5" />
                {recentRejections.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Notificações</h4>
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                          {recentRejections.length} Alertas
                        </span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {recentRejections.length === 0 ? (
                          <div className="p-8 text-center">
                            <CheckCircle2 className="h-8 w-8 text-green-200 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Tudo em ordem por aqui!</p>
                          </div>
                        ) : (
                          recentRejections.map((r, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                navigateToEdit(clients.find(c => c.id === r.clientId)!);
                                setIsNotificationsOpen(false);
                              }}
                              className="w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="flex gap-3">
                                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-gray-900 mb-0.5">
                                    Documento Recusado: {r.docName}
                                  </p>
                                  <p className="text-[10px] text-gray-500 line-clamp-1 mb-1">
                                    Cliente: {r.clientName}
                                  </p>
                                  <p className="text-[10px] text-red-500 italic bg-red-50 px-2 py-1 rounded border border-red-100">
                                    "{r.reason}"
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <DashboardStats clients={clients} />
                
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                    {selectedDevelopment ? `Pastas: ${selectedDevelopment.name}` : 'Todas as Pastas'}
                  </h3>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setEditingClient(null); setView('register'); }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#ec1847] text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                      <Plus className="h-4 w-4" />
                      Novo Cliente
                    </button>
                    {(userProfile?.role === 'admin' || userProfile?.role === 'gestor') && (
                      <button 
                        onClick={() => setView('import')}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
                      >
                        <FileUp className="h-4 w-4" />
                        Importar Excel
                      </button>
                    )}
                  </div>
                </div>

                <ClientList 
                  clients={clients.filter(c => {
                    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.taxId.includes(searchQuery);
                    const matchesDev = !selectedDevelopment || c.developmentId === selectedDevelopment.id;
                    return matchesSearch && matchesDev;
                  })} 
                  segments={developments}
                  onEdit={navigateToEdit}
                  onAttachDocument={(client) => setQuickAttachClient(client)}
                />
              </motion.div>
            )}

            {view === 'developments' && (
              <motion.div 
                key="developments"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {(userProfile?.role === 'admin' || userProfile?.role === 'gestor') ? (
                  <DevelopmentManagement />
                ) : (
                  <CommercialView 
                    userProfile={userProfile!} 
                    onSelectDevelopment={(dev, directRegister) => {
                      setSelectedDevelopment(dev);
                      if (directRegister) {
                        setEditingClient(null);
                        setView('register');
                      } else {
                        setView('dashboard');
                      }
                    }} 
                  />
                )}
              </motion.div>
            )}

            {(view === 'register' || view === 'edit') && (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <ClientForm 
                  client={editingClient} 
                  segments={developments}
                  onCancel={() => setView('dashboard')}
                  onSuccess={() => setView('dashboard')}
                  user={user}
                  userProfile={userProfile}
                  developmentId={selectedDevelopment?.id}
                />
              </motion.div>
            )}

            {view === 'import' && (
              <motion.div 
                key="import"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <ImportExcel 
                  user={user} 
                  clients={clients}
                  segments={developments}
                  onSuccess={() => setView('dashboard')} 
                />
              </motion.div>
            )}

            {view === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <Reports clients={clients} segments={developments} />
              </motion.div>
            )}

            {view === 'users' && userProfile?.role === 'admin' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <UserManagement currentUser={userProfile} />
              </motion.div>
            )}

            {view === 'settings' && userProfile?.role === 'admin' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <Settings userProfile={userProfile} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Gemini Assistant Floating Button */}
      {user && !isChatOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 h-16 w-16 bg-[#ec1847] text-white rounded-full shadow-2xl flex items-center justify-center z-40 group"
        >
          <Sparkles className="h-7 w-7" />
          <div className="absolute right-full mr-4 px-4 py-2 bg-white text-gray-900 rounded-xl shadow-xl text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-100">
            Assistente Virtual
          </div>
        </motion.button>
      )}

      {/* Gemini Assistant Sidebar */}
      <AnimatePresence>
        {isChatOpen && (
          <GeminiChat onClose={() => setIsChatOpen(false)} clients={clients} />
        )}
      </AnimatePresence>

      {/* Quick Attach Modal */}
      <AnimatePresence>
        {quickAttachClient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setQuickAttachClient(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <FileUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Anexar Documento</h3>
                    <p className="text-sm text-gray-500">Cliente: <span className="font-bold text-gray-700">{quickAttachClient.name}</span></p>
                  </div>
                </div>
              </div>

              <DocumentOCR 
                onDataExtracted={async (data) => {
                  if (!quickAttachClient.id) return;
                  
                  try {
                    const docName = data.customDocName || data.documentType || 'Documento';
                    const newDocUrls = [...(quickAttachClient.documentUrls || []), data.imageData || ''];
                    const newDocStatus = {
                      ...(quickAttachClient.documents?.status || {}),
                      [docName]: 'pending' as const
                    };

                    await updateDoc(doc(db, 'clients', quickAttachClient.id), {
                      documentUrls: newDocUrls,
                      'documents.status': newDocStatus,
                      status: 'Aguardando Validação',
                      updatedAt: serverTimestamp()
                    });

                    toast.success(`Documento "${docName}" anexado com sucesso!`);
                    setQuickAttachClient(null);
                  } catch (error) {
                    console.error('Error attaching document:', error);
                    toast.error('Erro ao anexar documento');
                  }
                }} 
              />
              
              <div className="mt-6 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  O documento será processado e anexado automaticamente à pasta do cliente.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: ReactNode, label: string, collapsed: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
        active 
          ? "bg-red-50 text-[#ec1847] font-semibold shadow-sm" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
        collapsed && "justify-center"
      )}
    >
      <span className={cn("h-5 w-5", active ? "text-[#ec1847]" : "text-gray-400")}>
        {icon}
      </span>
      {!collapsed && <span className="text-sm">{label}</span>}
    </button>
  );
}

function DashboardStats({ clients }: { clients: Client[] }) {
  const convertedCount = clients.filter(c => c.status === 'convertida').length;
  const conversionRate = clients.length > 0 ? ((convertedCount / clients.length) * 100).toFixed(1) : 0;

  const rejectedDocsCount = clients.reduce((acc, c) => {
    const rejected = Object.values(c.documents.status || {}).filter(s => s === 'rejected').length;
    return acc + rejected;
  }, 0);

  const stats = [
    { label: 'Total de Pastas', value: clients.length, icon: <FileText className="h-5 w-5" />, color: 'bg-blue-500' },
    { label: 'Aguardando Validação', value: clients.filter(c => c.status === 'Aguardando Validação').length, icon: <Clock className="h-5 w-5" />, color: 'bg-amber-500' },
    { label: 'Doc. Recusados', value: rejectedDocsCount, icon: <AlertTriangle className="h-5 w-5" />, color: 'bg-red-500' },
    { label: 'Vendas (Conversão)', value: `${convertedCount} (${conversionRate}%)`, icon: <TrendingUp className="h-5 w-5" />, color: 'bg-[#ec1847]' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((s, i) => (
        <motion.div 
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
        >
          <div className={cn("p-3 rounded-xl text-white", s.color)}>
            {s.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
