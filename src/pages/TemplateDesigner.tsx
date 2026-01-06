import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedTemplateDesigner } from '@/components/designer/AdvancedTemplateDesigner';

export default function TemplateDesigner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = searchParams.get('templateId');

  const { data: editTemplate, isLoading } = useQuery({
    queryKey: ['template-for-edit', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });

  if (templateId && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading template...</div>
      </div>
    );
  }

  return (
    <AdvancedTemplateDesigner 
      editTemplate={editTemplate} 
      onBack={() => navigate(-1)} 
    />
  );
}
