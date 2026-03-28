import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Client, Development, ClientType, UserProfile } from '../types';
import { db, collection, addDoc, updateDoc, doc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { Save, X, Plus, Trash2, Info, CheckCircle2, AlertCircle, AlertTriangle, FileSearch, MapPin, Loader2 as Spinner, Eye, ExternalLink, Image as ImageIcon, Users, Check, FileText, ZoomIn, ZoomOut, RotateCw, Upload, XCircle } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { cn, formatCurrency } from '../lib/utils';
import DocumentOCR from './DocumentOCR';
import { motion, AnimatePresence } from 'motion/react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const partnerSchema = z.object({
  name: z.string().min(3, 'Nome obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  email: z.string().regex(EMAIL_REGEX, 'E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
});

const spouseSchema = z.object({
  name: z.string().optional(),
  taxId: z.string().optional(),
  rg: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  profession: z.string().optional(),
  income: z.number().optional(),
});

const clientSchema = z.object({
  type: z.enum(['PF', 'PJ']),
  category: z.enum(['Ouro', 'Prata', 'Bronze', 'Cadastro']),
  isForeign: z.boolean().optional(),
  name: z.string().min(3, 'Nome/Razão Social obrigatório'),
  taxId: z.string().optional(),
  rne: z.string().optional(),
  email: z.string().regex(EMAIL_REGEX, 'E-mail inválido'),
  phone: z.string().optional(),
  foreignPhone: z.string().optional(),
  country: z.string().optional(),
  foreignAddress: z.string().optional(),
  developmentId: z.string().min(1, 'Empreendimento obrigatório'),
  income: z.number().min(0),
  status: z.string(),
  // PF
  rg: z.string().optional(),
  birthDate: z.string().optional(),
  maritalStatus: z.string().optional(),
  addressInfo: z.object({
    cep: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
  profession: z.string().optional(),
  spouseInfo: spouseSchema.optional(),
  // PJ
  stateRegistration: z.string().optional(),
  partners: z.array(partnerSchema).optional(),
  divergences: z.array(z.object({
    field: z.string(),
    value1: z.string(),
    value2: z.string(),
    document1: z.string(),
    document2: z.string(),
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.isForeign) {
    if (!data.rne && !data.taxId) {
      const message = "Informe o CPF/CNPJ ou o RNE";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["taxId"]
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["rne"]
      });
    }
  } else {
    if (!data.taxId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF/CNPJ é obrigatório",
        path: ["taxId"]
      });
    } else if (data.taxId.length < 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF/CNPJ inválido",
        path: ["taxId"]
      });
    }
  }
});

interface Props {
  client: Client | null;
  segments: Development[];
  onCancel: () => void;
  onSuccess: () => void;
  user: any;
  userProfile: UserProfile | null;
  developmentId?: string;
}

export default function ClientForm({ client, segments, onCancel, onSuccess, user, userProfile, developmentId }: Props) {
  const [activeTab, setActiveTab] = useState<'principal' | 'spouse' | 'pj' | 'docs'>('principal');
  const [activeSegment, setActiveSegment] = useState<Development | null>(null);
  const [mandatoryChecked, setMandatoryChecked] = useState<string[]>(client?.documents.mandatory || []);
  const [optionalChecked, setOptionalChecked] = useState<string[]>(client?.documents.optional || []);
  const [observations, setObservations] = useState(client?.documents.observations || '');
  const [showOCR, setShowOCR] = useState(false);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [documentUrls, setDocumentUrls] = useState<string[]>(client?.documentUrls || []);
  const [docStatus, setDocStatus] = useState<{[key: string]: 'pending' | 'approved' | 'rejected'}>(client?.documents?.status || {});
  const [rejectionReasons, setRejectionReasons] = useState<{[key: string]: string}>(client?.documents?.rejectionReasons || {});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [selectedImage]);
  const [divergences, setDivergences] = useState<Client['divergences']>(client?.divergences || []);
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({});

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? {
      ...client,
      addressInfo: client.addressInfo || {
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      }
    } : {
      type: 'PF',
      category: 'Cadastro',
      isForeign: false,
      name: '',
      taxId: '',
      rne: '',
      email: '',
      phone: '',
      foreignPhone: '',
      country: '',
      foreignAddress: '',
      developmentId: developmentId || '',
      income: 0,
      status: 'Aguardando Validação',
      partners: [],
      addressInfo: {
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      }
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "partners"
  });

  const clientType = watch('type');
  const isForeign = watch('isForeign');
  const selectedSegmentId = watch('developmentId');
  const income = watch('income');

  useEffect(() => {
    const seg = segments.find(s => s.id === selectedSegmentId);
    setActiveSegment(seg || null);
  }, [selectedSegmentId, segments]);

  // Automatic Classification Logic
  useEffect(() => {
    if (!activeSegment) return;

    const mandatoryCount = activeSegment.mandatoryDocs.length;
    const checkedCount = mandatoryChecked.length;
    const isIncomeHigh = income > 5000; // Example threshold

    let category: Client['category'] = 'Cadastro';

    if (checkedCount === mandatoryCount) {
      category = isIncomeHigh ? 'Ouro' : 'Prata';
    } else if (checkedCount > 0) {
      category = 'Bronze';
    }

    setValue('category', category);
  }, [mandatoryChecked, activeSegment, income, setValue]);

  // Reset taxId when switching type to avoid mask conflicts
  useEffect(() => {
    if (!client) {
      setValue('taxId', '');
    }
  }, [clientType, setValue, client]);

  const onSubmit = async (data: any) => {
    // Validate mandatory docs
    if (activeSegment) {
      const missingCount = activeSegment.mandatoryDocs.length - mandatoryChecked.length;
      if (missingCount > 0) {
        toast.error(`Faltam ${missingCount} documento(s) obrigatório(s) para o segmento ${activeSegment.name}.`);
        return;
      }
    }

    const payload = {
      ...data,
      documents: {
        mandatory: mandatoryChecked,
        optional: optionalChecked,
        observations,
        status: docStatus,
        rejectionReasons: rejectionReasons
      },
      documentUrls,
      divergences,
      updatedAt: serverTimestamp(),
    };

    try {
      if (client?.id) {
        await updateDoc(doc(db, 'clients', client.id), payload);
        toast.success('Pasta atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'clients'), {
          ...payload,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
        toast.success('Pasta cadastrada com sucesso');
      }
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, client?.id ? OperationType.UPDATE : OperationType.CREATE, 'clients');
    }
  };

  const onInvalid = (errors: any) => {
    console.error('Validation Errors:', errors);
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast.error(`Erro de validação: ${firstError.message}`);
    } else {
      toast.error('Por favor, preencha todos os campos obrigatórios corretamente.');
    }
  };

  const toggleDoc = (list: 'mandatory' | 'optional', doc: string) => {
    if (list === 'mandatory') {
      setMandatoryChecked(prev => prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]);
    } else {
      setOptionalChecked(prev => prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]);
    }
  };

  const handleOCRExtracted = (data: any) => {
    const docName = data.customDocName || data.documentType || 'Documento';
    const buyerType = data.buyerType || '1º Comprador';

    const getPriority = (type: string) => {
      if (['RG', 'CNH', 'CPF'].includes(type)) return 1;
      if (type === 'Ficha' || type === 'Ficha Cadastral') return 2;
      return 3;
    };

    const normalizeForComparison = (value: string) => {
      if (!value) return '';
      return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
        .replace(/\(a\)/g, '') // Remove (A) from marital status
        .replace(/[.\-()]/g, ''); // Remove punctuation for IDs
    };

    const checkDivergence = (field: string, newValue: any, label: string) => {
      const currentValue = watch(field as any);
      if (!currentValue || !newValue) return;

      const v1 = normalizeForComparison(String(currentValue));
      const v2 = normalizeForComparison(String(newValue));

      if (v1 !== v2) {
        const source = fieldSources[field] || 'Manual/Anterior';
        // Check if this divergence already exists to avoid duplicates
        setDivergences(prev => {
          const exists = prev?.some(d => d.field === label && d.value2 === String(newValue));
          if (exists) return prev;
          return [
            ...(prev || []),
            {
              field: label,
              value1: String(currentValue),
              value2: String(newValue),
              document1: source,
              document2: docName,
              fieldPath: field
            }
          ];
        });
      }
    };

    // Helper to update field with priority and divergence check
    const updateField = (field: string, value: any, label: string) => {
      if (!value) return;
      
      checkDivergence(field, value, label);

      const incomingPriority = getPriority(docName);
      const currentPriority = getPriority(fieldSources[field] || '');

      // Priority: Official (1) > Ficha (2) > Others (3)
      if (!fieldSources[field] || incomingPriority < currentPriority) {
        setValue(field as any, value);
        setFieldSources(prev => ({ ...prev, [field]: docName }));
      }
    };

    // Map fields based on buyerType
    const prefix = buyerType === '2º Comprador' ? 'spouseInfo.' : 
                   buyerType === 'PJ' ? 'pjInfo.' : '';
    
    // If it's "Sócios", we might need to find the right partner or append
    if (buyerType === 'Sócios') {
      // For now, let's just toast that we extracted partner data
      toast.info(`Dados de sócio extraídos de ${docName}. Por favor, verifique a aba PJ.`);
      // Logic to find/update partners could go here
      return;
    }

    if (data.name) updateField(prefix + 'name', data.name, 'Nome');
    if (data.taxId) updateField(prefix + 'taxId', data.taxId, 'CPF/CNPJ');
    if (data.rg) updateField(prefix + 'rg', data.rg, 'RG');
    if (data.email) updateField(prefix + 'email', data.email, 'E-mail');
    if (data.phone) updateField(prefix + 'phone', data.phone, 'Telefone');
    if (data.birthDate) updateField(prefix + 'birthDate', data.birthDate, 'Data de Nascimento');
    if (data.maritalStatus) updateField(prefix + 'maritalStatus', data.maritalStatus, 'Estado Civil');
    if (data.profession) updateField(prefix + 'profession', data.profession, 'Profissão');
    if (data.income) updateField(prefix + 'income', data.income, 'Renda');

    if (data.address) {
      const addrPrefix = prefix + 'addressInfo.';
      if (data.address.cep) updateField(addrPrefix + 'cep', data.address.cep, 'CEP');
      if (data.address.street) updateField(addrPrefix + 'street', data.address.street, 'Rua');
      if (data.address.number) updateField(addrPrefix + 'number', data.address.number, 'Número');
      if (data.address.complement) updateField(addrPrefix + 'complement', data.address.complement, 'Complemento');
      if (data.address.neighborhood) updateField(addrPrefix + 'neighborhood', data.address.neighborhood, 'Bairro');
      if (data.address.city) updateField(addrPrefix + 'city', data.address.city, 'Cidade');
      if (data.address.state) updateField(addrPrefix + 'state', data.address.state, 'Estado');
    }

    // Auto-detect type based on taxId length if possible
    if (data.taxId) {
      const cleanTaxId = data.taxId.replace(/\D/g, '');
      if (cleanTaxId.length === 11) setValue('type', 'PF');
      if (cleanTaxId.length === 14) setValue('type', 'PJ');
    }
    
    if (data.imageData) {
      setDocumentUrls(prev => [...prev, data.imageData]);
    }
    
    setShowOCR(false);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;
      newUrls.push(base64);
    }
    setDocumentUrls(prev => {
      const updatedUrls = [...prev, ...newUrls];
      // Initialize status for new docs
      const newStatus = { ...docStatus };
      newUrls.forEach((_, idx) => {
        const docName = `Doc ${prev.length + idx + 1}`;
        newStatus[docName] = 'pending';
      });
      setDocStatus(newStatus);
      return updatedUrls;
    });
    toast.success(`${files.length} documento(s) adicionado(s)`);
  };

  const updateDocStatus = (docName: string, status: 'approved' | 'rejected', reason?: string) => {
    setDocStatus(prev => ({ ...prev, [docName]: status }));
    if (reason) {
      setRejectionReasons(prev => ({ ...prev, [docName]: reason }));
    } else {
      const newReasons = { ...rejectionReasons };
      delete newReasons[docName];
      setRejectionReasons(newReasons);
    }
  };

  const handleCEPLookup = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setIsSearchingCEP(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setValue('addressInfo.street', data.logradouro);
          setValue('addressInfo.neighborhood', data.bairro);
          setValue('addressInfo.city', data.localidade);
          setValue('addressInfo.state', data.uf);
          toast.success('Endereço localizado!');
        } else {
          toast.error('CEP não encontrado.');
          clearAddress();
        }
      } catch (error) {
        toast.error('Erro ao buscar CEP.');
      } finally {
        setIsSearchingCEP(false);
      }
    }
  };

  const clearAddress = () => {
    setValue('addressInfo.street', '');
    setValue('addressInfo.neighborhood', '');
    setValue('addressInfo.city', '');
    setValue('addressInfo.state', '');
    setValue('addressInfo.number', '');
    setValue('addressInfo.complement', '');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-lopes-blue rounded-xl flex items-center justify-center text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{client ? 'Editar Pasta' : 'Nova Pasta'}</h2>
            <p className="text-xs text-gray-500">Preencha os dados e anexe os documentos para classificação.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border",
            watch('category') === 'Ouro' ? "bg-emerald-500 text-white border-emerald-600" :
            watch('category') === 'Prata' ? "bg-lopes-alert text-amber-900 border-amber-400" :
            watch('category') === 'Bronze' ? "bg-orange-500 text-white border-orange-600" :
            "bg-gray-200 text-gray-600 border-gray-300"
          )}>
            Categoria: {watch('category')}
          </div>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <TabButton active={activeTab === 'principal'} onClick={() => setActiveTab('principal')} label="Comprador Principal" />
        {clientType === 'PF' && (
          <TabButton active={activeTab === 'spouse'} onClick={() => setActiveTab('spouse')} label="Cônjuge / 2º Comprador" />
        )}
        {clientType === 'PJ' && (
          <TabButton active={activeTab === 'pj'} onClick={() => setActiveTab('pj')} label="Sócios" />
        )}
        <TabButton active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} label="Documentos & OCR" />
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'principal' && (
            <motion.div
              key="principal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Dados do Comprador</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setValue('isForeign', false)}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", !isForeign ? "bg-lopes-blue text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}
                      >
                        Nacional
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('isForeign', true)}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", isForeign ? "bg-lopes-blue text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}
                      >
                        Estrangeiro
                      </button>
                    </div>
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setValue('type', 'PF')}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", clientType === 'PF' ? "bg-lopes-blue text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}
                      >
                        PF
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('type', 'PJ')}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", clientType === 'PJ' ? "bg-lopes-blue text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}
                      >
                        PJ
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Nome Completo / Razão Social" error={errors.name?.message}>
                    <input {...register('name')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                  </FormField>

                  <FormField label={clientType === 'PF' ? 'CPF' : 'CNPJ'} error={errors.taxId?.message}>
                    <Controller
                      name="taxId"
                      control={control}
                      render={({ field }) => (
                        <IMaskInput
                          mask={clientType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                          unmask={true}
                          value={field.value}
                          onAccept={(value) => field.onChange(value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all"
                          placeholder={isForeign ? "Opcional se tiver RNE" : ""}
                        />
                      )}
                    />
                  </FormField>

                  {isForeign && (
                    <FormField label="RNE (Registro Nacional de Estrangeiro)" error={errors.rne?.message}>
                      <input {...register('rne')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                    </FormField>
                  )}

                  <FormField label="E-mail" error={errors.email?.message}>
                    <input {...register('email')} type="email" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                  </FormField>

                  <FormField label={isForeign ? "Telefone Internacional" : "Telefone / Celular"} error={isForeign ? errors.foreignPhone?.message : errors.phone?.message}>
                    {isForeign ? (
                      <input {...register('foreignPhone')} placeholder="+1 234 567 890" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                    ) : (
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <IMaskInput
                            mask="(00) 00000-0000"
                            unmask={true}
                            value={field.value}
                            onAccept={(value) => field.onChange(value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all"
                          />
                        )}
                      />
                    )}
                  </FormField>

                  {clientType === 'PF' && (
                    <>
                      <FormField label="RG" error={errors.rg?.message}>
                        <input {...register('rg')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                      </FormField>
                      <FormField label="Data de Nascimento" error={errors.birthDate?.message}>
                        <input {...register('birthDate')} type="date" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                      </FormField>
                    </>
                  )}

                  <FormField label="Empreendimento / Segmento">
                    <select {...register('developmentId')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all appearance-none bg-white">
                      <option value="">Selecione...</option>
                      {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.developer})</option>)}
                    </select>
                  </FormField>

                  <FormField label="Renda Mensal (R$)">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        {...register('income', { valueAsNumber: true })} 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" 
                      />
                    </div>
                  </FormField>

                  {clientType === 'PF' && (
                    <>
                      <FormField label="Profissão">
                        <input {...register('profession')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                      </FormField>
                      <FormField label="Estado Civil">
                        <select {...register('maritalStatus')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all bg-white">
                          <option value="">Selecione...</option>
                          <option value="solteiro">Solteiro(a)</option>
                          <option value="casado">Casado(a)</option>
                          <option value="divorciado">Divorciado(a)</option>
                          <option value="viuvo">Viúvo(a)</option>
                          <option value="uniao_estavel">União Estável</option>
                        </select>
                      </FormField>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic Address Fields */}
              {activeSegment && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-lopes-blue" />
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Endereço de Residência</h3>
                    </div>
                    <button
                      type="button"
                      onClick={clearAddress}
                      className="text-[10px] font-black text-gray-400 hover:text-lopes-red uppercase tracking-widest transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="p-8">
                    {isForeign ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="País de Origem" error={errors.country?.message}>
                          <input {...register('country')} placeholder="Ex: Estados Unidos, Portugal..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                        </FormField>
                        <FormField label="Endereço Completo (Exterior)" error={errors.foreignAddress?.message}>
                          <textarea {...register('foreignAddress')} placeholder="Rua, Número, Cidade, Estado, Código Postal..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all min-h-[100px] resize-none" />
                        </FormField>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField label="CEP" error={errors.addressInfo?.cep?.message}>
                          <div className="relative">
                            <Controller
                              name="addressInfo.cep"
                              control={control}
                              render={({ field }) => (
                                <IMaskInput
                                  mask="00000-000"
                                  unmask={true}
                                  value={field.value}
                                  onAccept={(value) => {
                                    field.onChange(value);
                                    if (value.length === 8) handleCEPLookup(value);
                                  }}
                                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all"
                                />
                              )}
                            />
                            {isSearchingCEP && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 border-2 border-lopes-blue border-t-transparent rounded-full animate-spin" /></div>}
                          </div>
                        </FormField>

                        {(!activeSegment.addressFields || activeSegment.addressFields.street) && (
                          <div className="md:col-span-2">
                            <FormField label="Logradouro" error={errors.addressInfo?.street?.message}>
                              <input {...register('addressInfo.street')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                            </FormField>
                          </div>
                        )}

                        {(!activeSegment.addressFields || activeSegment.addressFields.number) && (
                          <FormField label="Número" error={errors.addressInfo?.number?.message}>
                            <input {...register('addressInfo.number')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                          </FormField>
                        )}

                        {(!activeSegment.addressFields || activeSegment.addressFields.complement) && (
                          <FormField label="Complemento">
                            <input {...register('addressInfo.complement')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                          </FormField>
                        )}

                        {(!activeSegment.addressFields || activeSegment.addressFields.neighborhood) && (
                          <FormField label="Bairro" error={errors.addressInfo?.neighborhood?.message}>
                            <input {...register('addressInfo.neighborhood')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                          </FormField>
                        )}

                        {(!activeSegment.addressFields || activeSegment.addressFields.city) && (
                          <FormField label="Cidade" error={errors.addressInfo?.city?.message}>
                            <input {...register('addressInfo.city')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                          </FormField>
                        )}

                        {(!activeSegment.addressFields || activeSegment.addressFields.state) && (
                          <FormField label="Estado" error={errors.addressInfo?.state?.message}>
                            <input {...register('addressInfo.state')} maxLength={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all uppercase" />
                          </FormField>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'spouse' && (
            <motion.div
              key="spouse"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Cônjuge / Segundo Comprador</h3>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Nome Completo">
                    <input {...register('spouseInfo.name')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                  </FormField>
                  <FormField label="CPF">
                    <Controller
                      name="spouseInfo.taxId"
                      control={control}
                      render={({ field }) => (
                        <IMaskInput
                          mask="000.000.000-00"
                          unmask={true}
                          value={field.value || ''}
                          onAccept={(value) => field.onChange(value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all"
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="RG">
                    <input {...register('spouseInfo.rg')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                  </FormField>
                  <FormField label="E-mail">
                    <input {...register('spouseInfo.email')} type="email" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                  </FormField>
                  <FormField label="Telefone">
                    <Controller
                      name="spouseInfo.phone"
                      control={control}
                      render={({ field }) => (
                        <IMaskInput
                          mask="(00) 00000-0000"
                          unmask={true}
                          value={field.value || ''}
                          onAccept={(value) => field.onChange(value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all"
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Data de Nascimento">
                    <input {...register('spouseInfo.birthDate')} type="date" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                  </FormField>
                  <FormField label="Profissão">
                    <input {...register('spouseInfo.profession')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" />
                  </FormField>
                  <FormField label="Renda Mensal (R$)">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        {...register('spouseInfo.income', { valueAsNumber: true })} 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all" 
                      />
                    </div>
                  </FormField>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pj' && (
            <motion.div
              key="pj"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Sócios / Representantes</h3>
                  <button 
                    type="button" 
                    onClick={() => append({ name: '', cpf: '', email: '', phone: '' })}
                    className="flex items-center gap-2 px-4 py-2 bg-lopes-blue text-white rounded-xl text-xs font-bold hover:bg-lopes-blue/90 transition-all shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Adicionar Sócio
                  </button>
                </div>
                <div className="p-8 space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                      <button 
                        type="button" 
                        onClick={() => remove(index)} 
                        className="absolute -top-2 -right-2 p-2 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <FormField label="Nome">
                        <input {...register(`partners.${index}.name`)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-lopes-blue" />
                      </FormField>
                      <FormField label="CPF">
                        <Controller
                          name={`partners.${index}.cpf`}
                          control={control}
                          render={({ field }) => (
                            <IMaskInput
                              mask="000.000.000-00"
                              unmask={true}
                              value={field.value}
                              onAccept={(value) => field.onChange(value)}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-lopes-blue"
                            />
                          )}
                        />
                      </FormField>
                      <FormField label="E-mail">
                        <input {...register(`partners.${index}.email`)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-lopes-blue" />
                      </FormField>
                      <FormField label="Telefone">
                        <Controller
                          name={`partners.${index}.phone`}
                          control={control}
                          render={({ field }) => (
                            <IMaskInput
                              mask="(00) 00000-0000"
                              unmask={true}
                              value={field.value}
                              onAccept={(value) => field.onChange(value)}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-lopes-blue"
                            />
                          )}
                        />
                      </FormField>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                      <p className="text-sm text-gray-400">Nenhum sócio adicionado.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* OCR Scanner Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowOCR(!showOCR)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-lopes-blue/10 rounded-xl flex items-center justify-center">
                      <FileSearch className="h-6 w-6 text-lopes-blue" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">Análise Inteligente (OCR)</h3>
                      <p className="text-sm text-gray-500">Extraia dados automaticamente de documentos oficiais ou fichas.</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all",
                    showOCR ? "bg-gray-100 text-gray-600" : "bg-lopes-blue text-white shadow-md"
                  )}>
                    {showOCR ? "Fechar Scanner" : "Abrir Scanner"}
                  </div>
                </button>

                {showOCR && (
                  <div className="p-8 border-t border-gray-100 bg-gray-50/30">
                    <DocumentOCR onDataExtracted={handleOCRExtracted} />
                  </div>
                )}
              </div>

              {/* Divergences Section */}
              {divergences && divergences.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
                  <div className="p-4 bg-amber-100/50 border-b border-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-700" />
                    <div>
                      <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest">Divergências Detectadas</h3>
                      <p className="text-[10px] text-amber-600 uppercase tracking-widest font-bold">Escolha qual informação manter para cada campo</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {divergences.map((div, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{div.field}</span>
                          <div className="flex items-center gap-4">
                            <button 
                              type="button"
                              onClick={() => {
                                if (div.fieldPath) {
                                  setValue(div.fieldPath as any, div.value1);
                                  setFieldSources(prev => ({ ...prev, [div.fieldPath!]: div.document1 }));
                                }
                                setDivergences(prev => prev?.filter((_, i) => i !== idx));
                              }}
                              className="flex flex-col text-left p-2 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                            >
                              <span className="text-[10px] text-gray-400 uppercase font-bold">{div.document1}</span>
                              <span className="text-sm font-bold text-gray-900">{div.value1}</span>
                            </button>
                            <div className="h-8 w-px bg-gray-100" />
                            <button 
                              type="button"
                              onClick={() => {
                                if (div.fieldPath) {
                                  setValue(div.fieldPath as any, div.value2);
                                  setFieldSources(prev => ({ ...prev, [div.fieldPath!]: div.document2 }));
                                }
                                setDivergences(prev => prev?.filter((_, i) => i !== idx));
                              }}
                              className="flex flex-col text-left p-2 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                            >
                              <span className="text-[10px] text-gray-400 uppercase font-bold">{div.document2}</span>
                              <span className="text-sm font-bold text-lopes-red">{div.value2}</span>
                            </button>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setDivergences(prev => prev?.filter((_, i) => i !== idx))}
                          className="text-[10px] font-black text-amber-700 hover:text-amber-900 uppercase tracking-widest underline underline-offset-4"
                        >
                          Ignorar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Checklist Obrigatório</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    {activeSegment?.mandatoryDocs.map(doc => (
                      <label key={doc} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all cursor-pointer group">
                        <div 
                          onClick={() => toggleDoc('mandatory', doc)}
                          className={cn(
                            "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                            mandatoryChecked.includes(doc) ? "bg-emerald-500 border-emerald-500" : "border-gray-200 group-hover:border-emerald-200"
                          )}
                        >
                          {mandatoryChecked.includes(doc) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={cn("text-sm font-medium", mandatoryChecked.includes(doc) ? "text-gray-900" : "text-gray-500")}>{doc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Documentos Opcionais</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    {activeSegment?.optionalDocs.map(doc => (
                      <label key={doc} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all cursor-pointer group">
                        <div 
                          onClick={() => toggleDoc('optional', doc)}
                          className={cn(
                            "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                            optionalChecked.includes(doc) ? "bg-lopes-blue border-lopes-blue" : "border-gray-200 group-hover:border-lopes-blue/20"
                          )}
                        >
                          {optionalChecked.includes(doc) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={cn("text-sm font-medium", optionalChecked.includes(doc) ? "text-gray-900" : "text-gray-500")}>{doc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Preview */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Arquivos Anexados</h3>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all shadow-sm">
                    <Upload className="h-3.5 w-3.5 text-lopes-blue" />
                    Upload em Massa
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={handleBulkUpload}
                      accept="image/*,application/pdf"
                    />
                  </label>
                </div>
                <div className="p-8">
                  {documentUrls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                      {documentUrls.map((url, idx) => {
                        const docName = `Doc ${idx + 1}`;
                        const status = docStatus[docName] || 'pending';
                        const isGestor = userProfile?.role === 'gestor' || userProfile?.role === 'admin';

                        return (
                          <div key={idx} className="relative group aspect-[3/4] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                            {url.startsWith('data:application/pdf') ? (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 bg-white">
                                <FileText className="h-12 w-12" />
                                <span className="text-[10px] font-black uppercase">PDF</span>
                              </div>
                            ) : (
                              <img src={url} alt={docName} className="w-full h-full object-cover" />
                            )}
                            
                            {/* Status Badge */}
                            <div className={cn(
                              "absolute top-2 left-2 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm z-10",
                              status === 'approved' ? "bg-emerald-500 text-white" :
                              status === 'rejected' ? "bg-red-500 text-white" :
                              "bg-amber-500 text-white"
                            )}>
                              {status === 'approved' ? 'Aprovado' : status === 'rejected' ? 'Recusado' : 'Pendente'}
                            </div>

                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4 z-20">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedImage(url)}
                                  className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                                  title="Visualizar"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDocumentUrls(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-white transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              {isGestor && (
                                <div className="flex flex-col gap-2 w-full">
                                  <button
                                    type="button"
                                    onClick={() => updateDocStatus(docName, 'approved')}
                                    className="w-full py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const reason = prompt('Motivo da recusa:');
                                      if (reason) updateDocStatus(docName, 'rejected', reason);
                                    }}
                                    className="w-full py-1.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Recusar
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {status === 'rejected' && rejectionReasons[docName] && (
                              <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 p-2 z-10">
                                <p className="text-[8px] text-white font-medium leading-tight">
                                  Motivo: {rejectionReasons[docName]}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl">
                      <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">Nenhum documento anexado ainda.</p>
                      <p className="text-xs text-gray-500 mt-1">Use o scanner OCR acima para adicionar documentos.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Observações da Pasta</h3>
                </div>
                <div className="p-8">
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Adicione notas internas sobre esta pasta..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lopes-blue/20 focus:border-lopes-blue outline-none transition-all min-h-[120px] resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-12 py-3 bg-lopes-blue text-white rounded-xl text-sm font-bold hover:bg-lopes-blue/90 transition-all shadow-lg shadow-lopes-blue/20 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {client ? 'Salvar Alterações' : 'Cadastrar Pasta'}
          </button>
        </div>
      </form>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Controls */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 z-[110]">
            <button 
              type="button"
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
              className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-white text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button 
              type="button"
              onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
              className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <button 
              type="button"
              onClick={() => setRotation(prev => (prev + 90) % 360)}
              className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Rotacionar"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>

          <div className="max-w-full max-h-full overflow-auto p-4 flex items-center justify-center">
            {selectedImage.startsWith('data:application/pdf') ? (
              <div className="w-[90vw] h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl">
                <iframe 
                  src={selectedImage} 
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                />
              </div>
            ) : (
              <img 
                src={selectedImage} 
                alt="Documento em tamanho real" 
                className="max-w-full h-auto rounded-lg shadow-2xl transition-transform duration-200 ease-out"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-6 py-2 text-xs font-bold rounded-xl transition-all",
        active 
          ? "bg-white text-lopes-blue shadow-sm" 
          : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
      )}
    >
      {label}
    </button>
  );
}

function FormField({ label, children, error }: { label: string, children: React.ReactNode, error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      {children}
      {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
}
