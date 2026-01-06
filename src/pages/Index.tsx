import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container mx-auto p-4 flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-bold text-foreground">
          EduMid VDP Platform
        </h1>
        <p className="text-lg text-muted-foreground text-center max-w-2xl">
          Complete Variable Data Printing Management System for Bulk ID Cards, Certificates, and More
        </p>
        <Button onClick={() => navigate('/auth')} size="lg">
          Access Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Index;
