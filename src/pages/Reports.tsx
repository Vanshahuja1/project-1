import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, TrendingUp, PieChart } from 'lucide-react';

export default function Reports() {
  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">View sales, profit, and analytics reports</p>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">
            <BarChart className="h-4 w-4 mr-2" />
            Sales Report
          </TabsTrigger>
          <TabsTrigger value="profit">
            <TrendingUp className="h-4 w-4 mr-2" />
            Profit Report
          </TabsTrigger>
          <TabsTrigger value="expected">
            <PieChart className="h-4 w-4 mr-2" />
            Expected Sales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales Report</CardTitle>
              <CardDescription>View your sales performance and trends</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
              Sales report data will be displayed here
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit">
          <Card>
            <CardHeader>
              <CardTitle>Profit Report</CardTitle>
              <CardDescription>Analyze your profit margins and revenue</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
              Profit report data will be displayed here
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expected">
          <Card>
            <CardHeader>
              <CardTitle>Expected Sales Report</CardTitle>
              <CardDescription>Forecast future sales and revenue</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
              Expected sales data will be displayed here
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
