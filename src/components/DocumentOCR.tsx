import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Type } from "@google/genai";
import { FileSearch, Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.5.207/pdf.worker.min.mjs`;

interface OCRResult {
  name?: string;
  taxId?: string;
  birthDate?: string;
  documentType?: string;
  isValid?: boolean;
  confidence?: number;
  reason?: string;
  imageData?: string;
  maritalStatus?: string;
  rg?: string;
  email?: string;
  phone?: string;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  income?: number;
  profession?: string;
  buyerType?: '1º Comprador' | '2º Comprador' | 'PJ' | 'Sócios';
  customDocName?: string;
}

interface Props {
  onDataExtracted: (data: OCRResult) => void;
}

export default function DocumentOCR({ onDataExtracted }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<OCRResult | null>(null);
  const [buyerType, setBuyerType] = useState<'1º Comprador' | '2º Comprador' | 'PJ' | 'Sócios'>('1º Comprador');
  const [customDocName, setCustomDocName] = useState('');

  const handleConfirm = () => {
    if (!lastResult) return;
    const finalResult = {
      ...lastResult,
      buyerType,
      customDocName: customDocName || lastResult.documentType
    };
    onDataExtracted(finalResult);
    setPreview(null);
    setLastResult(null);
    setIsClassifying(false);
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => (item as any).str)
          .join(' ');
        fullText += `--- Página ${i} ---\n${pageText}\n\n`;
      }
      
      return fullText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Não foi possível extrair o texto do PDF.');
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setFileType(file.type);
    setPreview(URL.createObjectURL(file));
    setLastResult(null);

    try {
      const isPDF = file.type === 'application/pdf';
      let extractedText = '';
      let base64Data = '';

      if (isPDF) {
        extractedText = await extractTextFromPDF(file);
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const promptText = `Analise este documento e extraia as informações no formato JSON especificado. 
      Tipos de documentos suportados: RG, CNH, CPF, Certidão de Casamento/Nascimento, Comprovante de Residência, Holerite, Ficha Cadastral.
      
      Instruções específicas:
      1. Identifique o tipo de documento em 'documentType'.
      2. Extraia o máximo de informações possíveis: nome, CPF/CNPJ (taxId), RG, e-mail, telefone, data de nascimento, estado civil, endereço completo, renda mensal e profissão.
      3. Verifique se o documento parece autêntico e legível.
      4. Se o documento não for válido ou legível, defina isValid como false e forneça um motivo claro em 'reason'.
      
      Retorne apenas o JSON.`;

      const contents: any = {
        parts: []
      };

      if (isPDF && extractedText) {
        contents.parts.push({
          text: `TEXTO EXTRAÍDO DO PDF:\n${extractedText}\n\n${promptText}`
        });
      } else {
        contents.parts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        });
        contents.parts.push({
          text: promptText,
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome completo do titular" },
              taxId: { type: Type.STRING, description: "CPF ou CNPJ sem formatação" },
              rg: { type: Type.STRING, description: "RG sem formatação" },
              email: { type: Type.STRING, description: "Endereço de e-mail" },
              phone: { type: Type.STRING, description: "Telefone com DDD" },
              birthDate: { type: Type.STRING, description: "Data de nascimento no formato YYYY-MM-DD" },
              documentType: { type: Type.STRING, description: "Tipo do documento (RG, CNH, CPF, Certidão, Residência, Holerite, Ficha)" },
              maritalStatus: { type: Type.STRING, description: "Estado civil se disponível" },
              address: {
                type: Type.OBJECT,
                properties: {
                  cep: { type: Type.STRING },
                  street: { type: Type.STRING },
                  number: { type: Type.STRING },
                  complement: { type: Type.STRING },
                  neighborhood: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                }
              },
              income: { type: Type.NUMBER, description: "Renda mensal se disponível (ex: holerite)" },
              profession: { type: Type.STRING, description: "Profissão se disponível" },
              isValid: { type: Type.BOOLEAN, description: "Se o documento parece válido e legível" },
              confidence: { type: Type.NUMBER, description: "Nível de confiança de 0 a 1" },
              reason: { type: Type.STRING, description: "Motivo detalhado se não for válido" },
            },
            required: ["isValid", "confidence", "documentType"],
          },
        },
      });

      const result = JSON.parse(response.text || '{}') as OCRResult;
      result.imageData = `data:${file.type};base64,${base64Data}`;
      setLastResult(result);
      setCustomDocName(result.documentType || '');

      if (result.isValid) {
        toast.success(`${result.documentType} processado com sucesso!`);
        setIsClassifying(true);
      } else {
        toast.error(result.reason || 'Não foi possível validar o documento.');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Erro ao processar o documento com IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processImage(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4",
          isDragActive ? "border-red-500 bg-red-50/50" : "border-gray-200 hover:border-red-300 hover:bg-gray-50",
          isProcessing && "opacity-50 cursor-wait",
          lastResult && !lastResult.isValid && "border-red-300 bg-red-50/30"
        )}
      >
        <input {...getInputProps()} />
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
            <p className="text-sm font-medium text-gray-600">Analisando documento com IA...</p>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-[240px] aspect-[4/3] rounded-xl overflow-hidden border-2 border-white shadow-lg bg-gray-100 flex items-center justify-center">
              {fileType === 'application/pdf' ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <FileSearch className="h-12 w-12" />
                  <span className="text-xs font-bold">PDF</span>
                </div>
              ) : (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </div>
            {lastResult && !lastResult.isValid && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium animate-bounce">
                <AlertCircle className="h-4 w-4" />
                {lastResult.reason || 'Documento inválido'}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
              <FileSearch className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {isDragActive ? "Solte o arquivo aqui" : "Arraste o documento ou clique para upload"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Suporta JPG, PNG e PDF (RG, CNH, Comprovantes, etc.)</p>
            </div>
          </>
        )}
      </div>

      {preview && !isProcessing && !isClassifying && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          {lastResult?.isValid ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Documento validado. Agora classifique-o abaixo.
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 text-red-500" />
              Falha na validação. Tente uma foto mais nítida.
            </>
          )}
        </div>
      )}

      {isClassifying && lastResult && (
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Classificação Obrigatória</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Identifique o documento e o comprador</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo/Nome do Documento</label>
              <input 
                type="text"
                value={customDocName}
                onChange={(e) => setCustomDocName(e.target.value)}
                placeholder="Ex: RG, CNH, Ficha..."
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comprador / Relacionado</label>
              <select 
                value={buyerType}
                onChange={(e) => setBuyerType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all appearance-none"
              >
                <option value="1º Comprador">1º Comprador</option>
                <option value="2º Comprador">2º Comprador</option>
                <option value="PJ">PJ (Empresa)</option>
                <option value="Sócios">Sócios / Representantes</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setPreview(null);
                setLastResult(null);
                setIsClassifying(false);
              }}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              Confirmar e Preencher
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
