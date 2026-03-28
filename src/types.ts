export type ClientStatus = 'Aguardando Validação' | 'pendente' | 'em análise' | 'aprovada' | 'reprovada' | 'convertida';
export type ClientType = 'PF' | 'PJ';
export type ClientCategory = 'Ouro' | 'Prata' | 'Bronze' | 'Cadastro';
export type UserRole = 'corretor' | 'gestor' | 'admin';
export type DevelopmentStatus = 'Breve Lançamento' | 'Pré Lançamento' | 'Lançamento' | 'Inativo';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  cpf?: string;
  phone?: string;
  team?: string; // Equipe de vendas
  active: boolean;
  photoURL?: string;
  createdAt: any;
}

export interface Client {
  id?: string;
  type: ClientType;
  category: ClientCategory;
  name: string;
  taxId: string; // CPF or CNPJ
  email: string;
  phone: string;
  status: ClientStatus;
  developmentId: string; // Empreendimento
  income: number;
  documents: {
    mandatory: string[];
    optional: string[];
    observations: string;
    status?: {
      [docName: string]: 'pending' | 'approved' | 'rejected';
    };
    rejectionReasons?: {
      [docName: string]: string;
    };
  };
  documentUrls?: string[];
  divergences?: {
    field: string;
    value1: string;
    value2: string;
    document1: string;
    document2: string;
    fieldPath?: string;
  }[];
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
  // Foreign client support
  isForeign?: boolean;
  rne?: string;
  country?: string;
  foreignAddress?: string;
  foreignPhone?: string;
  // PF specific
  rg?: string;
  birthDate?: string;
  maritalStatus?: string;
  addressInfo?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  profession?: string;
  spouseInfo?: {
    name: string;
    taxId: string;
    rg?: string;
    email: string;
    phone: string;
    birthDate?: string;
    profession?: string;
    income?: number;
  };
  // PJ specific
  stateRegistration?: string;
  partners?: {
    name: string;
    cpf: string;
    email: string;
    phone: string;
  }[];
}

export interface Development {
  id: string;
  name: string;
  developer: string; // Incorporador
  address: string;
  status: DevelopmentStatus;
  launchDate?: string;
  mandatoryDocs: string[];
  optionalDocs: string[];
  meta?: number;
  realized?: number;
  addressFields?: {
    cep?: boolean;
    street?: boolean;
    number?: boolean;
    complement?: boolean;
    neighborhood?: boolean;
    city?: boolean;
    state?: boolean;
  };
  createdAt: any;
  updatedAt?: any;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: any;
}

export type View = 'home' | 'dashboard' | 'register' | 'edit' | 'import' | 'reports' | 'users' | 'settings' | 'developments' | 'development-detail';
