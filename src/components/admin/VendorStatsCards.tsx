import { Card, CardContent } from '@/components/ui/card';
import { Users, Building2, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';

type VendorStats = {
  total: number;
  active: number;
  suspended: number;
  masters: number;
  subVendors: number;
  totalBalance: number;
  totalRevenue: number;
  lowBalanceCount: number;
};

interface VendorStatsCardsProps {
  stats: VendorStats;
  lowBalanceThreshold: number;
}

export function VendorStatsCards({ stats, lowBalanceThreshold }: VendorStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Vendors</p>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">
                {stats.active} active / {stats.suspended} suspended
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendor Types</p>
              <p className="text-xl font-bold">{stats.masters}</p>
              <p className="text-xs text-muted-foreground">
                Masters / {stats.subVendors} Sub
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Wallet className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="text-xl font-bold">₹{stats.totalBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">All wallets</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">All vendors</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={stats.lowBalanceCount > 0 ? 'border-red-500/50' : ''}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.lowBalanceCount > 0 ? 'bg-red-500/10' : 'bg-muted'}`}>
              <AlertTriangle className={`h-5 w-5 ${stats.lowBalanceCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Balance</p>
              <p className="text-xl font-bold">{stats.lowBalanceCount}</p>
              <p className="text-xs text-muted-foreground">
                Below ₹{lowBalanceThreshold.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
