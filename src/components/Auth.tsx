import { useState } from 'react';
import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, googleProvider, doc, getDoc, setDoc, serverTimestamp, query, where, getDocs, deleteDoc, collection } from '../firebase';
import { UserRole, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, CreditCard, Users, Building2, ChevronRight, Loader2 as Spinner, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  type: 'admin' | 'commercial';
  onBack: () => void;
  onSuccess: () => void;
}

export default function Auth({ type, onBack, onSuccess }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    cpf: '',
    phone: '',
    team: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success('Bem-vindo de volta!');
      } else {
        // Sign up (only for commercial/corretor)
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Check if user was pre-registered
        const q = query(collection(db, 'users'), where('email', '==', formData.email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        let preRegisteredData: Partial<UserProfile> = {};
        
        if (!querySnapshot.empty) {
          const preRegDoc = querySnapshot.docs[0];
          preRegisteredData = preRegDoc.data() as UserProfile;
          // Delete the pending document if it's different from the new UID
          if (preRegDoc.id !== user.uid) {
            await deleteDoc(doc(db, 'users', preRegDoc.id));
          }
        }

        const newProfile: UserProfile = {
          uid: user.uid,
          email: formData.email.toLowerCase(),
          name: formData.name || preRegisteredData.name || '',
          role: formData.email.toLowerCase() === 'batista21batista@gmail.com' ? 'admin' : (preRegisteredData.role || 'corretor'),
          cpf: formData.cpf || preRegisteredData.cpf || '',
          phone: formData.phone || preRegisteredData.phone || '',
          team: formData.team || preRegisteredData.team || '',
          active: preRegisteredData.active !== undefined ? preRegisteredData.active : true,
          createdAt: preRegisteredData.createdAt || serverTimestamp()
        };

        await setDoc(doc(db, 'users', user.uid), newProfile);
        toast.success('Cadastro realizado com sucesso!');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login por e-mail não está ativado no Firebase Console.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('E-mail ou senha incorretos.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está em uso.');
      } else {
        toast.error('Ocorreu um erro na autenticação.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Check if user was pre-registered by email
        const q = query(collection(db, 'users'), where('email', '==', user.email?.toLowerCase()));
        const querySnapshot = await getDocs(q);
        let preRegisteredData: Partial<UserProfile> = {};

        if (!querySnapshot.empty) {
          const preRegDoc = querySnapshot.docs[0];
          preRegisteredData = preRegDoc.data() as UserProfile;
          // Delete the pending document
          if (preRegDoc.id !== user.uid) {
            await deleteDoc(doc(db, 'users', preRegDoc.id));
          }
        }

        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email?.toLowerCase() || '',
          name: user.displayName || preRegisteredData.name || '',
          role: user.email?.toLowerCase() === 'batista21batista@gmail.com' ? 'admin' : (preRegisteredData.role || 'corretor'),
          active: preRegisteredData.active !== undefined ? preRegisteredData.active : true,
          photoURL: user.photoURL || '',
          createdAt: preRegisteredData.createdAt || serverTimestamp(),
          cpf: preRegisteredData.cpf || '',
          phone: preRegisteredData.phone || '',
          team: preRegisteredData.team || ''
        };
        await setDoc(docRef, newProfile);
      }
      
      toast.success('Login realizado com sucesso!');
      onSuccess();
    } catch (error: any) {
      console.error('Google Auth error:', error);
      toast.error('Erro ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
      >
        <div className="p-10">
          <div className="flex justify-between items-center mb-10">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-red-500 rounded-lg flex items-center justify-center">
                {type === 'admin' ? <Building2 className="h-5 w-5 text-white" /> : <Users className="h-5 w-5 text-white" />}
              </div>
              <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                {type === 'admin' ? 'Administrativo' : 'Comercial'}
              </span>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Bem-vindo' : 'Crie sua conta'}
            </h2>
            <p className="text-gray-500 text-sm">
              {isLogin ? 'Acesse o sistema Lopes Consultoria.' : 'Cadastre-se como corretor autorizado.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6"
                >
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                    <input 
                      required
                      type="text"
                      placeholder="Nome Completo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        required
                        type="text"
                        placeholder="CPF"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        required
                        type="text"
                        placeholder="Telefone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                    <input 
                      required
                      type="text"
                      placeholder="Equipe de Vendas"
                      value={formData.team}
                      onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
              <input 
                required
                type="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
              <input 
                required
                type="password"
                placeholder="Senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all text-sm"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Spinner className="h-5 w-5 animate-spin" /> : (isLogin ? 'Entrar' : 'Cadastrar')}
              {!loading && <ChevronRight className="h-5 w-5" />}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Ou</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="h-5 w-5" alt="Google" />
              Entrar com Google
            </button>
          </form>

          {type === 'commercial' && (
            <div className="mt-8 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre aqui'}
              </button>
            </div>
          )}

          {type === 'admin' && isLogin && (
            <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                O acesso administrativo é restrito a gestores e administradores autorizados pela Lopes Consultoria.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
