import { useState, useEffect } from 'react';
import { db, doc, getDoc, setDoc, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { Settings as SettingsIcon, Palette, Type, Save, Loader2 as Spinner, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface AppSettings {
  appName: string;
  primaryColor: string;
  logoUrl?: string;
}

interface Props {
  userProfile: UserProfile;
}

export default function Settings({ userProfile }: Props) {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'Lopes CRM',
    primaryColor: '#ec1847'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AppSettings);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/config');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
      toast.success('Configurações salvas com sucesso!');
      // Update CSS variable for primary color
      document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
      // Reload to apply changes globally if needed, or use a context
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-red-500" />
            Configurações do Sistema (White-Label)
          </h3>
        </div>
        
        <div className="p-8 space-y-8">
          {/* App Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Type className="h-4 w-4 text-gray-400" />
                Nome do Aplicativo
              </h4>
              <p className="text-xs text-gray-500 mt-1">Este nome aparecerá no título e na barra lateral.</p>
            </div>
            <div className="md:col-span-2">
              <input 
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                placeholder="Ex: Lopes CRM"
              />
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Primary Color */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Palette className="h-4 w-4 text-gray-400" />
                Cor Primária
              </h4>
              <p className="text-xs text-gray-500 mt-1">Define a cor principal dos botões e destaques.</p>
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <input 
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="h-12 w-12 rounded-lg border-2 border-white shadow-sm cursor-pointer"
              />
              <input 
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-mono text-sm"
              />
              <div 
                className="h-10 w-10 rounded-xl shadow-inner"
                style={{ backgroundColor: settings.primaryColor }}
              />
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Logo URL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-400" />
                URL da Logomarca
              </h4>
              <p className="text-xs text-gray-500 mt-1">URL da imagem para substituir o logo padrão.</p>
            </div>
            <div className="md:col-span-2">
              <input 
                type="text"
                value={settings.logoUrl || ''}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                placeholder="https://exemplo.com/logo.png"
              />
              {settings.logoUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                  <img src={settings.logoUrl} alt="Preview Logo" className="h-12 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
          >
            {saving ? <Spinner className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
        <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Aviso de Customização
        </h4>
        <p className="text-xs text-amber-700 leading-relaxed">
          As alterações de cor e nome do sistema são aplicadas globalmente para todos os usuários. 
          Certifique-se de usar cores com bom contraste para garantir a acessibilidade do sistema.
          O sistema será reiniciado automaticamente após salvar para aplicar as novas configurações.
        </p>
      </div>
    </div>
  );
}

import { AlertTriangle } from 'lucide-react';
