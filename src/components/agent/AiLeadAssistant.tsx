import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Sparkles, MessageSquare, Mail, Send } from 'lucide-react';
import { addToast } from '@/components/ui/toast';

export function AiLeadAssistant() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');

  const handleGenerate = async (type: 'email' | 'whatsapp') => {
    if (!prompt) {
      addToast('error', 'Please provide some context for the AI');
      return;
    }
    
    setIsGenerating(true);
    setResult('');
    
    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResponse = type === 'email' 
      ? `Subject: Following up on your property inquiry\n\nHi there,\n\nThank you for reaching out regarding the property. Based on your interest in ${prompt}, I'd be happy to schedule a site visit or share more details.\n\nLet me know what time works best for you.\n\nBest regards,\nYour RealtyNow Agent`
      : `Hi! Thanks for your inquiry about ${prompt}. Let me know if you'd like to schedule a site visit or if you need the brochure! 🏡✨`;
      
    setResult(mockResponse);
    setIsGenerating(false);
  };

  return (
    <Card className="p-5 border-primary-100 bg-gradient-to-br from-white to-primary-50">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-navy-900">AI Lead Assistant</h3>
          <p className="text-xs text-navy-600">Draft perfect emails and messages instantly</p>
        </div>
      </div>

      <Textarea
        placeholder="E.g., Client looking for a 3BHK in downtown under 1M. Follow up on their site visit yesterday..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="text-sm min-h-[80px] bg-white border-primary-200 focus:border-primary-400 mb-3"
      />

      {result && (
        <div className="mb-4 p-3 bg-white border border-primary-200 rounded-lg shadow-inner relative">
          <p className="text-sm text-navy-800 whitespace-pre-wrap">{result}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-2 right-2 h-7 px-2 text-xs bg-primary-50 hover:bg-primary-100"
            onClick={() => {
              navigator.clipboard.writeText(result);
              addToast('success', 'Copied to clipboard!');
            }}
          >
            Copy
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1 border-primary-200 text-primary-700 hover:bg-primary-50"
          onClick={() => handleGenerate('email')}
          disabled={isGenerating || !prompt}
          loading={isGenerating}
        >
          <Mail className="h-4 w-4 mr-2" /> Draft Email
        </Button>
        <Button 
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => handleGenerate('whatsapp')}
          disabled={isGenerating || !prompt}
          loading={isGenerating}
        >
          <MessageSquare className="h-4 w-4 mr-2" /> Draft WhatsApp
        </Button>
      </div>
    </Card>
  );
}
