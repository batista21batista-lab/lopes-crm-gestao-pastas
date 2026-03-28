import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { db, collection, addDoc, updateDoc, doc, serverTimestamp } from '../firebase';
import { toast } from 'sonner';
import { FileUp, FileText, CheckCircle2, AlertCircle, X, Download, Loader2, ShoppingBag, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Client, Development } from '../types';

interface Props {
  user: any;
  clients: Client[];
  segments: Development[];
  onSuccess: () => void;
}

interface ImportError {
  row: number;
  message: string;
}

export default function ImportExcel({ user, clients, segments, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'leads' | 'sales'>('leads');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        validateData(jsonData);
      };
      reader.readAsBinaryString(file);
    }
  }, [importMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    multiple: false
  } as any);

  const validateData = (jsonData: any[]) => {
    const newErrors: ImportError[] = [];
    const validData: any[] = [];

    jsonData.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (importMode === 'leads') {
        if (!row.Nome || row.Nome.length < 3) {
          newErrors.push({ row: rowNum, message: 'Nome inválido ou muito curto' });
        }
        if (!row.Documento || row.Documento.toString().length < 11) {
          newErrors.push({ row: rowNum, message: 'CPF/CNPJ inválido' });
        }
        
        validData.push({
          type: row.Tipo === 'PJ' ? 'PJ' : 'PF',
          name: row.Nome,
          taxId: row.Documento.toString().replace(/\D/g, ''),
          email: row.Email || '',
          phone: row.Telefone || '',
          status: 'Aguardando Validação',
          developmentId: row.Empreendimento || 'popular',
          income: parseFloat(row.Renda) || 0,
          documents: { mandatory: [], optional: [], observations: 'Importado via Excel' },
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      } else {
        // Sales Mode: Match by Documento
        const doc = row.Documento?.toString().replace(/\D/g, '');
        const matchingClient = clients.find(c => c.taxId.replace(/\D/g, '') === doc);
        
        if (!matchingClient) {
          newErrors.push({ row: rowNum, message: `Cliente com documento ${doc} não encontrado na base.` });
        } else {
          validData.push({
            clientId: matchingClient.id,
            developmentId: matchingClient.developmentId,
            name: matchingClient.name,
            taxId: doc
          });
        }
      }
    });

    setErrors(newErrors);
    setData(validData);
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setIsImporting(true);
    
    try {
      if (importMode === 'leads') {
        const batch = data.map(client => addDoc(collection(db, 'clients'), client));
        await Promise.all(batch);
        toast.success(`${data.length} novos clientes importados!`);
      } else {
        // Update existing clients to 'convertida'
        const updates = data.map(async (sale) => {
          await updateDoc(doc(db, 'clients', sale.clientId), {
            status: 'convertida',
            updatedAt: serverTimestamp()
          });
          
          // Update development realized count
          const development = segments.find(s => s.id === sale.developmentId);
          if (development) {
            await updateDoc(doc(db, 'developments', development.id), {
              realized: (development.realized || 0) + 1
            });
          }
        });
        await Promise.all(updates);
        toast.success(`${data.length} vendas registradas com sucesso!`);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar dados');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button 
              onClick={() => { setImportMode('leads'); setFile(null); setData([]); setErrors([]); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                importMode === 'leads' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Users className="h-4 w-4" /> Novos Leads
            </button>
            <button 
              onClick={() => { setImportMode('sales'); setFile(null); setData([]); setErrors([]); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                importMode === 'sales' ? "bg-white text-[#ec1847] shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <ShoppingBag className="h-4 w-4" /> Vendas Efetivadas
            </button>
          </div>

          <button 
            onClick={() => {
              const template = importMode === 'leads' 
                ? [{ Nome: 'João Silva', Documento: '12345678901', Email: 'joao@email.com', Telefone: '11999999999', Tipo: 'PF', Renda: 5000, Empreendimento: 'popular' }]
                : [{ Documento: '12345678901', DataVenda: '2024-03-27', Valor: 500000 }];
              
              const ws = XLSX.utils.json_to_sheet(template);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Template");
              XLSX.writeFile(wb, `template_lopes_${importMode}.xlsx`);
            }}
            className="flex items-center gap-2 text-xs font-semibold text-[#ec1847] hover:underline"
          >
            <Download className="h-3 w-3" /> Baixar Template {importMode === 'leads' ? 'Leads' : 'Vendas'}
          </button>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {importMode === 'leads' ? 'Importar Novos Leads' : 'Importar Vendas Efetivadas'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {importMode === 'leads' 
              ? 'Adicione novos interessados à base de dados para análise.' 
              : 'Cruze dados de vendas para analisar conversão e bater metas.'}
          </p>
        </div>

        <div 
          {...getRootProps()} 
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center",
            isDragActive ? "border-red-500 bg-red-50/50" : "border-gray-200 hover:border-red-300 hover:bg-gray-50/50",
            file && "border-emerald-500 bg-emerald-50/10"
          )}
        >
          <input {...getInputProps()} />
          <div className={cn(
            "h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-colors",
            file ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
          )}>
            {file ? <CheckCircle2 className="h-8 w-8" /> : <FileUp className="h-8 w-8" />}
          </div>
          {file ? (
            <div>
              <p className="text-gray-900 font-semibold">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-900 font-semibold">Selecione um arquivo</p>
              <p className="text-xs text-gray-500">Suporta .xlsx, .xls e .csv</p>
            </div>
          )}
          {file && (
            <button 
              onClick={(e) => { e.stopPropagation(); setFile(null); setData([]); setErrors([]); }}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {data.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 space-y-6"
            >
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-800">{data.length} registros prontos para importação</p>
                </div>
                <button 
                  onClick={handleImport}
                  disabled={isImporting}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Importação'}
                </button>
              </div>

              {errors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <h4 className="text-sm font-bold uppercase tracking-wider">Inconsistências Identificadas ({errors.length})</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-amber-100 rounded-xl divide-y divide-amber-50">
                    {errors.map((err, i) => (
                      <div key={i} className="px-4 py-2 text-xs text-amber-800 bg-amber-50/30">
                        <span className="font-bold">Linha {err.row}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
