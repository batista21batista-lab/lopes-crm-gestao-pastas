import { motion } from 'motion/react';
import { Shield, Users, Building2, ChevronRight, LayoutDashboard, UserCircle } from 'lucide-react';
import { View } from '../types';

interface Props {
  onSelectAccess: (type: 'admin' | 'commercial') => void;
  appName: string;
  logoUrl?: string;
}

export default function Home({ onSelectAccess, appName, logoUrl }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-gray-100 flex items-center justify-between px-8 lg:px-16">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">{appName}</span>
            </div>
          )}
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">Funcionalidades</a>
          <a href="#about" className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">Sobre</a>
          <button 
            onClick={() => onSelectAccess('commercial')}
            className="px-6 py-2 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
          >
            Acessar Sistema
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="relative py-20 lg:py-32 px-8 lg:px-16 overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                Lopes Consultoria de Imóveis
              </span>
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-8">
                Gestão Inteligente de <span className="text-red-500">Pastas e Documentos.</span>
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed mb-12 max-w-xl">
                A plataforma definitiva para corretores e gestores da Lopes. Agilidade na validação, 
                segurança na conformidade e controle total dos seus lançamentos.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => onSelectAccess('commercial')}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all group"
                >
                  <Users className="h-5 w-5" />
                  Acesso Comercial
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => onSelectAccess('admin')}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-2xl font-bold hover:border-red-500 hover:text-red-500 transition-all group"
                >
                  <Shield className="h-5 w-5" />
                  Administrativo
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-br from-red-500 to-orange-400 rounded-[4rem] rotate-6 absolute inset-0 opacity-10" />
              <img 
                src="https://picsum.photos/seed/realestate/800/800" 
                alt="Modern Building" 
                className="rounded-[3rem] shadow-2xl relative z-10 object-cover aspect-square"
                referrerPolicy="no-referrer"
              />
              
              {/* Floating Stats */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-8 -left-8 bg-white p-6 rounded-3xl shadow-xl z-20 border border-gray-100"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-green-100 rounded-2xl flex items-center justify-center">
                    <LayoutDashboard className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">98%</p>
                    <p className="text-xs text-gray-500 font-medium">Eficiência na Validação</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 bg-gray-50 px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Desenvolvido para Excelência</h2>
              <p className="text-gray-500">Ferramentas poderosas para cada etapa do processo de vendas.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Shield className="h-6 w-6" />,
                  title: "Segurança LGPD",
                  desc: "Tratamento rigoroso de dados sensíveis e logs de auditoria completos."
                },
                {
                  icon: <Users className="h-6 w-6" />,
                  title: "Fluxo Colaborativo",
                  desc: "Comunicação fluida entre corretores e gestores para aprovação de pastas."
                },
                {
                  icon: <Building2 className="h-6 w-6" />,
                  title: "Gestão de Lançamentos",
                  desc: "Controle total de empreendimentos, desde o pré-lançamento até a venda."
                }
              ].map((f, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl transition-all">
                  <div className="h-12 w-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-red-500" />
            <span className="font-bold text-gray-900">{appName}</span>
          </div>
          <p className="text-sm text-gray-400">© 2026 Lopes Consultoria de Imóveis. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest">Privacidade</a>
            <a href="#" className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
