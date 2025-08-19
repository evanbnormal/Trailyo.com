import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Users, TrendingUp, BarChart3, Gift, ChevronLeft, ChevronRight, Image as ImageIcon, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { analyticsService, TrailAnalytics as RealTrailAnalytics } from '@/lib/analytics';
import { Trail, TrailStep } from '@/lib/data';
import { useToast } from "@/components/ui/use-toast";

interface AnalyticsData {
  totalLearners: number;
  totalRevenue: number;
  totalWatchTime: number;
  completionRate: number;
  retentionRate: Array<{
    step: number;
    stepTitle: string;
    learnersReached: number;
    retentionRate: number;
  }>;
  revenueByStep: Array<{
    step: number;
    title: string;
    revenue: number;
  }>;
  completionRateByDay: Array<{
    date: string;
    completionRate: number;
  }>;
  watchTimeByDay: Array<{
    date: string;
    watchTime: number;
  }>;
  learnersByDay: Array<{
    date: string;
    learners: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
  }>;
  events: Array<{
    trailId: string;
    eventType: string;
    data: Record<string, unknown>;
    timestamp: number;
  }>;
}

type ActiveMetric = 'revenue' | 'tips' | 'learners' | 'completion' | 'dropoff' | 'watchtime';

// Helper function to get ordinal suffix
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Helper functions to generate time-based analytics from real events
function generateRevenueOverTime(events: any[]): Array<{ date: string; revenue: number }> {
  const revenueEvents = events.filter(e => e.eventType === 'step_skip' || e.eventType === 'tip_donated');
  const monthlyRevenue = new Map<string, number>();
  
  revenueEvents.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const amount = event.data.skipCost || event.data.tipAmount || 0;
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + amount);
  });
  
  // Generate data for all months in the current year (2024)
  const currentYear = '2024';
  const allMonths = [];
  for (let month = 1; month <= 12; month++) {
    const monthKey = `${currentYear}-${String(month).padStart(2, '0')}`;
    allMonths.push({
      date: monthKey,
      revenue: monthlyRevenue.get(monthKey) || 0
    });
  }
  
  return allMonths;
}

function generateRevenueByWeek(events: any[]): Array<{ week: string; revenue: number; month: string }> {
  const revenueEvents = events.filter(e => e.eventType === 'step_skip' || e.eventType === 'tip_donated');
  const weeklyRevenue = new Map<string, { revenue: number; month: string }>();
  
  revenueEvents.forEach(event => {
    const date = new Date(event.timestamp);
    const weekKey = `WEEK ${Math.ceil(date.getDate() / 7)}`;
    const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const amount = event.data.skipCost || event.data.tipAmount || 0;
    
    if (!weeklyRevenue.has(weekKey)) {
      weeklyRevenue.set(weekKey, { revenue: 0, month: monthKey });
    }
    weeklyRevenue.get(weekKey)!.revenue += amount;
  });
  
  return Array.from(weeklyRevenue.entries())
    .map(([week, data]) => ({ week, ...data }));
}

function generateRevenueByDay(events: any[]): Array<{ day: string; revenue: number; weekDate: string }> {
  const revenueEvents = events.filter(e => e.eventType === 'step_skip' || e.eventType === 'tip_donated');
  const dailyRevenue = new Map<string, { revenue: number; weekDate: string }>();
  
  revenueEvents.forEach(event => {
    const date = new Date(event.timestamp);
    const dayKey = date.toLocaleDateString('en-US', { weekday: 'long' });
    const weekDate = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' });
    const amount = event.data.skipCost || event.data.tipAmount || 0;
    
    if (!dailyRevenue.has(dayKey)) {
      dailyRevenue.set(dayKey, { revenue: 0, weekDate });
    }
    dailyRevenue.get(dayKey)!.revenue += amount;
  });
  
  // Generate data for all days of the week
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return daysOfWeek.map(day => ({
    day,
    revenue: dailyRevenue.get(day)?.revenue || 0,
    weekDate: dailyRevenue.get(day)?.weekDate || day
  }));
}

function generateDropOffOverTime(events: any[]): Array<{ date: string; dropOff: number }> {
  const trailViews = events.filter(e => e.eventType === 'trail_view');
  const monthlyDropOff = new Map<string, number>();
  
  trailViews.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyDropOff.set(monthKey, (monthlyDropOff.get(monthKey) || 0) + 1);
  });
  
  return Array.from(monthlyDropOff.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dropOff]) => ({ date, dropOff }));
}

function generateDropOffByTime(events: any[], totalLearners: number): Array<{ time: string; learners: number }> {
  const stepCompletions = events.filter(e => e.eventType === 'step_complete');
  const timeIntervals = [0, 5, 10, 15, 20, 25, 30, 35, 40];
  const dropOffData = [];
  
  for (let i = 0; i < timeIntervals.length; i++) {
    const time = timeIntervals[i];
    const learners = i === 0 ? totalLearners : Math.round(totalLearners * (1 - (i * 0.15)));
    dropOffData.push({ time: `${time} min`, learners });
  }
  
  return dropOffData;
}

function generateWatchTimeByTime(events: any[], totalWatchTime: number): Array<{ time: string; watchTime: number }> {
  const videoWatches = events.filter(e => e.eventType === 'video_watch');
  const timeIntervals = [0, 5, 10, 15, 20, 25, 30, 35, 40];
  const watchTimeData = [];
  
  for (let i = 0; i < timeIntervals.length; i++) {
    const time = timeIntervals[i];
    const watchTime = i === 0 ? 0 : Math.round(totalWatchTime * (i * 0.1));
    watchTimeData.push({ time: `${time} min`, watchTime });
  }
  
  return watchTimeData;
}

function generateWatchTimeOverTime(events: any[]): Array<{ date: string; watchTime: number }> {
  const videoWatches = events.filter(e => e.eventType === 'video_watch');
  const monthlyWatchTime = new Map<string, number>();
  
  videoWatches.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const watchTime = event.data.watchTime || 0;
    monthlyWatchTime.set(monthKey, (monthlyWatchTime.get(monthKey) || 0) + watchTime);
  });
  
  return Array.from(monthlyWatchTime.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, watchTime]) => ({ date, watchTime }));
}

const TrailAnalytics: React.FC = () => {
  const { trailId } = useParams<{ trailId: string }>();
  const navigate = useNavigate();
  const { getUserTrails } = useAuth();
  const { toast } = useToast();
  
  const [trail, setTrail] = useState<Trail | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [realAnalytics, setRealAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>('revenue');
  const [isMobile, setIsMobile] = useState(false);
  const [watchTimeToggle, setWatchTimeToggle] = useState<'total' | 'perStep' | 'overTime'>('total');
  const [revenueTimeToggle, setRevenueTimeToggle] = useState<'all' | 'day' | 'week' | 'month'>('month');
  const [revenueViewToggle, setRevenueViewToggle] = useState<'total' | 'skip' | 'tips'>('total');
  const [tipsToggle, setTipsToggle] = useState<'proportion' | 'overtime'>('proportion');
  const [tipsTimeToggle, setTipsTimeToggle] = useState<'day' | 'week' | 'month'>('month');
  const [dropoffToggle, setDropoffToggle] = useState<'step' | 'time'>('step');
  const [learnersToggle, setLearnersToggle] = useState<'total' | 'step'>('total');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedWeek, setSelectedWeek] = useState('WEEK 1');
  const [error, setError] = useState<string | null>(null);

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 1024 : false); // lg breakpoint
    };
    
    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkScreenSize);
      }
    };
  }, []);

  useEffect(() => {
    const loadTrailAndAnalytics = async () => {
      if (!trailId) return;

      try {
        // Load trail data
        const userTrails = await getUserTrails();
        const allUserTrails = [...userTrails.drafts, ...userTrails.published];
        const foundTrail = allUserTrails.find(t => t.id === trailId);
        
        if (foundTrail) {
          setTrail(foundTrail);
          
          // Load real analytics data
          const realAnalyticsData = await analyticsService.getTrailAnalytics(trailId);
          
          console.log('Loaded analytics data:', realAnalyticsData);
          console.log('Analytics breakdown:', {
            totalLearners: realAnalyticsData?.totalLearners,
            totalRevenue: realAnalyticsData?.totalRevenue,
            totalTips: realAnalyticsData?.totalTips,
            completionRate: realAnalyticsData?.completionRate,
            revenueByStep: realAnalyticsData?.revenueByStep,
            tipsOverTime: realAnalyticsData?.tipsOverTime,
            events: realAnalyticsData?.events?.length
          });
          
          if (realAnalyticsData) {
            setRealAnalytics(realAnalyticsData);
            // Convert real analytics to the expected format
            const analyticsData: AnalyticsData = {
              totalLearners: realAnalyticsData.totalLearners,
              totalRevenue: realAnalyticsData.totalRevenue,
              totalWatchTime: realAnalyticsData.totalWatchTime,
              completionRate: realAnalyticsData.completionRate,
              retentionRate: (realAnalyticsData as any).retentionRate || [],
              revenueByStep: (realAnalyticsData as any).revenueByStep?.map((s: any) => ({
                step: s.step,
                title: s.title,
                revenue: s.revenue
              })) || [],
              completionRateByDay: (realAnalyticsData as any).completionRateByDay || [],
              watchTimeByDay: (realAnalyticsData as any).watchTimeByDay || [],
              learnersByDay: (realAnalyticsData as any).learnersByDay || [],
              revenueByDay: (realAnalyticsData as any).revenueByDay || [],
              events: realAnalyticsData.events || [],
            };
            
            setAnalytics(analyticsData);
          } else {
            // No real analytics data yet, use empty data
            const emptyAnalytics: AnalyticsData = {
              totalLearners: 0,
              totalRevenue: 0,
              totalWatchTime: 0,
              completionRate: 0,
              retentionRate: [],
              revenueByStep: [],
              completionRateByDay: [],
              watchTimeByDay: [],
              learnersByDay: [],
              revenueByDay: [],
              events: [],
            };
            setAnalytics(emptyAnalytics);
          }
          
          setLoading(false);
        } else {
          // Trail not found, navigate to profile
          navigate('/profile');
        }
      } catch (error) {
        console.error('Error loading trail and analytics:', error);
        setLoading(false);
        setError('Failed to load analytics data. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load analytics data. Please try again.',
          variant: 'destructive',
        });
      }
    };

    loadTrailAndAnalytics();
  }, [trailId, getUserTrails, navigate, toast]);

  const handleResetAnalytics = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to reset all analytics for this trail? This action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      console.log('🗑️ Resetting analytics for trail:', trailId);
      await analyticsService.resetAnalytics(trailId);
      
      // Show success message
      toast({
        title: 'Success',
        description: 'Analytics reset successfully',
      });
      
      // Reload the page to refresh analytics
      window.location.reload();
    } catch (error) {
      console.error('Error resetting analytics:', error);
      setError('Failed to reset analytics. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to reset analytics. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRefreshAnalytics = async () => {
    try {
      setLoading(true);
      // Reload analytics data
      const realAnalyticsData = await analyticsService.getTrailAnalytics(trailId!);
      if (realAnalyticsData && trail) {
        setRealAnalytics(realAnalyticsData);
                  // Convert real analytics to the expected format
          const analyticsData: AnalyticsData = {
            totalLearners: realAnalyticsData.totalLearners,
            totalRevenue: realAnalyticsData.totalRevenue,
            totalWatchTime: realAnalyticsData.totalWatchTime,
            completionRate: realAnalyticsData.completionRate,
            retentionRate: (realAnalyticsData as any).retentionRate || [],
            revenueByStep: (realAnalyticsData as any).revenueByStep?.map((s: any) => ({
              step: s.step,
              title: s.title,
              revenue: s.revenue
            })) || [],
            completionRateByDay: (realAnalyticsData as any).completionRateByDay || [],
            watchTimeByDay: (realAnalyticsData as any).watchTimeByDay || [],
            learnersByDay: (realAnalyticsData as any).learnersByDay || [],
            revenueByDay: (realAnalyticsData as any).revenueByDay || [],
            events: realAnalyticsData.events || [],
          };
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      setLoading(false);
      setError('Failed to refresh analytics. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to refresh analytics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrailThumbnail = (trail: Trail) => {
    // Use custom thumbnail if set, otherwise use reward step's thumbnail
    if (trail.thumbnailUrl) {
      return trail.thumbnailUrl;
    }

    // Find the reward step and use its thumbnail
    const rewardStep = trail.steps.find(step => step.type === 'reward' && step.thumbnailUrl);
    return rewardStep?.thumbnailUrl || '/placeholder.svg';
  };

  const renderChart = (section: string, data: any[], timeToggle: string) => {
    if (!analytics) return null;

    const chartHeight = isMobile ? 'h-64' : 'h-80';

    switch (section) {
      case 'revenue':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Trail Revenue Analytics
                </CardTitle>
                <p className="text-sm text-gray-600 mb-2">
                  Total revenue from skip step payments and tip payments
                </p>
                <div className="flex gap-2 items-center">
                  <ToggleGroup
                    type="single"
                    value={revenueViewToggle}
                    onValueChange={v => v && setRevenueViewToggle(v as 'total' | 'skip' | 'tips')}
                    className="rounded-md bg-white border border-gray-200 flex gap-1 transition-all duration-300 h-9 items-center box-border p-1"
                  >
                    <ToggleGroupItem value="total" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">Total</ToggleGroupItem>
                    <ToggleGroupItem value="skip" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">Skipped</ToggleGroupItem>
                    <ToggleGroupItem value="tips" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">Tips</ToggleGroupItem>
                  </ToggleGroup>
                  <div className="flex gap-2"> 
                    <Button size="sm" variant={revenueTimeToggle === 'day' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('day')}>Days</Button>
                    <Button size="sm" variant={revenueTimeToggle === 'week' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('week')}>Weeks</Button>
                    <Button size="sm" variant={revenueTimeToggle === 'month' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('month')}>Months</Button>
                  </div>
                </div>
              </div>
              {/* Period Selector Dropdowns */}
              <div className="flex gap-2 items-center">
                {revenueTimeToggle === 'month' && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {revenueTimeToggle === 'week' && (
                  <>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Jan</SelectItem>
                        <SelectItem value="02">Feb</SelectItem>
                        <SelectItem value="03">Mar</SelectItem>
                        <SelectItem value="04">Apr</SelectItem>
                        <SelectItem value="05">May</SelectItem>
                        <SelectItem value="06">Jun</SelectItem>
                        <SelectItem value="07">Jul</SelectItem>
                        <SelectItem value="08">Aug</SelectItem>
                        <SelectItem value="09">Sep</SelectItem>
                        <SelectItem value="10">Oct</SelectItem>
                        <SelectItem value="11">Nov</SelectItem>
                        <SelectItem value="12">Dec</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                {revenueTimeToggle === 'day' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">Jan</SelectItem>
                          <SelectItem value="02">Feb</SelectItem>
                          <SelectItem value="03">Mar</SelectItem>
                          <SelectItem value="04">Apr</SelectItem>
                          <SelectItem value="05">May</SelectItem>
                          <SelectItem value="06">Jun</SelectItem>
                          <SelectItem value="07">Jul</SelectItem>
                          <SelectItem value="08">Aug</SelectItem>
                          <SelectItem value="09">Sep</SelectItem>
                          <SelectItem value="10">Oct</SelectItem>
                          <SelectItem value="11">Nov</SelectItem>
                          <SelectItem value="12">Dec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const selectedYearNum = parseInt(selectedYear);
                            const selectedMonthNum = parseInt(selectedMonth);
                            const weeks = [];
                            
                            for (let week = 1; week <= 4; week++) {
                              // Calculate the Monday date for each week
                              const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                              const firstMonday = new Date(firstDayOfMonth);
                              const dayOfWeek = firstDayOfMonth.getDay();
                              const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                              firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                              
                              // Add weeks to get to the current week
                              const mondayDate = new Date(firstMonday);
                              mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                              
                              const weekKey = `WEEK ${week}`;
                              const day = mondayDate.getDate();
                              const ordinal = getOrdinalSuffix(day);
                              const weekLabel = `${day}${ordinal}`;
                              weeks.push({ key: weekKey, label: weekLabel });
                            }
                            
                            return weeks.map(({ key, label }) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            {/* Revenue Summary */}
            <div className="px-6 py-4 bg-white">
              <div className="text-center">
                {revenueViewToggle === 'total' && (
                  <>
                    <div className="text-2xl font-bold text-green-600">
                      ${realAnalytics?.totalRevenue?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </>
                )}
                {revenueViewToggle === 'skip' && (
                  <>
                    <div className="text-2xl font-bold text-blue-600">
                      ${realAnalytics?.totalSkipRevenue?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">Skipped Revenue</div>
                  </>
                )}
                {revenueViewToggle === 'tips' && (
                  <>
                    <div className="text-2xl font-bold text-orange-600">
                      ${realAnalytics?.totalTips?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">Tips Revenue</div>
                  </>
                )}
              </div>
            </div>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    // Get the appropriate data based on the toggle
                    let chartData;
                    let dataKey;
                    let strokeColor;
                    let tooltipLabel;

                    if (revenueViewToggle === 'total') {
                      chartData = realAnalytics?.revenueOverTime || [];
                      dataKey = 'revenue';
                      strokeColor = '#10b981';
                      tooltipLabel = 'Total Revenue';
                    } else if (revenueViewToggle === 'skip') {
                      // Use the new skip revenue data
                      chartData = realAnalytics?.revenueByDay || [];
                      dataKey = 'revenue';
                      strokeColor = '#3b82f6';
                      tooltipLabel = 'Skip Payments';
                    } else if (revenueViewToggle === 'tips') {
                      // Use the new tips data
                      chartData = realAnalytics?.tipsByDay || [];
                      dataKey = 'amount';
                      strokeColor = '#f97316';
                      tooltipLabel = 'Tip Payments';
                    } else {
                      // Default to total revenue
                      chartData = realAnalytics?.revenueOverTime || [];
                      dataKey = 'revenue';
                      strokeColor = '#10b981';
                      tooltipLabel = 'Total Revenue';
                    }

                    if (revenueTimeToggle === 'month') {
                      // Generate all months for the selected year
                      const allMonths = [];
                      for (let month = 1; month <= 12; month++) {
                        const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
                        const monthData = chartData?.find(item => item.date === monthKey);
                        allMonths.push({
                          date: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' }),
                          [dataKey]: monthData && monthData[dataKey] !== undefined ? Number(monthData[dataKey].toFixed(2)) : 0
                        });
                      }
                                              return (
                          <LineChart data={allMonths}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    } else if (revenueTimeToggle === 'week') {
                      // Generate all weeks for the selected month with Monday dates
                      const allWeeks = [];
                      const selectedYearNum = parseInt(selectedYear);
                      const selectedMonthNum = parseInt(selectedMonth);
                      
                      for (let week = 1; week <= 4; week++) {
                        // Calculate the Monday date for each week
                        const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                        const firstMonday = new Date(firstDayOfMonth);
                        const dayOfWeek = firstDayOfMonth.getDay();
                        const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek); // If Sunday, go to next Monday
                        firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                        
                        // Add weeks to get to the current week
                        const mondayDate = new Date(firstMonday);
                        mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                        
                        const weekKey = `WEEK ${week}`;
                        const weekData = chartData?.find(item => item.week === weekKey);
                        allWeeks.push({
                          week: mondayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                          [dataKey]: weekData && weekData[dataKey] !== undefined ? Number(weekData[dataKey].toFixed(2)) : 0
                        });
                      }
                                              return (
                          <LineChart data={allWeeks}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    } else {
                      // Daily view - generate all days of the week for the selected week
                      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      
                      // Calculate the Monday date for the selected week
                      const selectedYearNum = parseInt(selectedYear);
                      const selectedMonthNum = parseInt(selectedMonth);
                      const weekNum = parseInt(selectedWeek.split(' ')[1]);
                      
                      const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                      const firstMonday = new Date(firstDayOfMonth);
                      const dayOfWeek = firstDayOfMonth.getDay();
                      const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                      firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                      
                      const selectedMonday = new Date(firstMonday);
                      selectedMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
                      
                      const allDays = daysOfWeek.map((day, index) => {
                        const currentDate = new Date(selectedMonday);
                        currentDate.setDate(selectedMonday.getDate() + index);
                        
                        // Format current date to match backend format (YYYY-MM-DD)
                        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                        
                        const dayData = realAnalytics?.revenueByDay?.find(item => item.date === dateKey);
                        
                        return {
                          day: `${currentDate.toLocaleDateString('en-US', { weekday: 'short' })} ${currentDate.getDate()}`,
                          [dataKey]: dayData && dayData[dataKey] !== undefined ? Number(dayData[dataKey].toFixed(2)) : 0
                        };
                      });
                                                                      return (
                          <LineChart data={allDays}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="day" 
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              interval={0}
                            />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, '']} labelFormatter={() => ''} />
                            <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                          </LineChart>
                        );
                    }
                    
                    // Default fallback
                    return (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No data available
                      </div>
                    );
                  })()}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'tips':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 mb-4">
                <Gift className="h-5 w-5 text-orange-600" />
                Tips Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realAnalytics?.tipsOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, '']} />
                    <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'learners':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-blue-600" />
                  Learners
                </CardTitle>
                <p className="text-sm text-gray-600 mb-2">
                  Total visitors and learners over time
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant={revenueTimeToggle === 'all' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('all')}>Total</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'day' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('day')}>Days</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'week' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('week')}>Weeks</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'month' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('month')}>Months</Button>
                </div>
              </div>
              {/* Period Selector Dropdowns - Only show for specific time periods */}
              {revenueTimeToggle !== 'all' && (
                <div className="flex gap-2 items-center">
                {revenueTimeToggle === 'month' && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {revenueTimeToggle === 'week' && (
                  <>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Jan</SelectItem>
                        <SelectItem value="02">Feb</SelectItem>
                        <SelectItem value="03">Mar</SelectItem>
                        <SelectItem value="04">Apr</SelectItem>
                        <SelectItem value="05">May</SelectItem>
                        <SelectItem value="06">Jun</SelectItem>
                        <SelectItem value="07">Jul</SelectItem>
                        <SelectItem value="08">Aug</SelectItem>
                        <SelectItem value="09">Sep</SelectItem>
                        <SelectItem value="10">Oct</SelectItem>
                        <SelectItem value="11">Nov</SelectItem>
                        <SelectItem value="12">Dec</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                {revenueTimeToggle === 'day' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">Jan</SelectItem>
                          <SelectItem value="02">Feb</SelectItem>
                          <SelectItem value="03">Mar</SelectItem>
                          <SelectItem value="04">Apr</SelectItem>
                          <SelectItem value="05">May</SelectItem>
                          <SelectItem value="06">Jun</SelectItem>
                          <SelectItem value="07">Jul</SelectItem>
                          <SelectItem value="08">Aug</SelectItem>
                          <SelectItem value="09">Sep</SelectItem>
                          <SelectItem value="10">Oct</SelectItem>
                          <SelectItem value="11">Nov</SelectItem>
                          <SelectItem value="12">Dec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const selectedYearNum = parseInt(selectedYear);
                            const selectedMonthNum = parseInt(selectedMonth);
                            const weeks = [];
                            
                            for (let week = 1; week <= 4; week++) {
                              // Calculate the Monday date for each week
                              const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                              const firstMonday = new Date(firstDayOfMonth);
                              const dayOfWeek = firstDayOfMonth.getDay();
                              const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                              firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                              
                              // Add weeks to get to the current week
                              const mondayDate = new Date(firstMonday);
                              mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                              
                              const weekKey = `WEEK ${week}`;
                              const day = mondayDate.getDate();
                              const ordinal = getOrdinalSuffix(day);
                              const weekLabel = `${day}${ordinal}`;
                              weeks.push({ key: weekKey, label: weekLabel });
                            }
                            
                            return weeks.map(({ key, label }) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              )}
            </CardHeader>
            {/* Learners Summary */}
            <div className="px-6 py-4 bg-white">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {realAnalytics?.totalLearners || 0}
                </div>
                <div className="text-sm text-gray-600">Total Learners</div>
              </div>
            </div>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    let chartData = realAnalytics?.learnersOverTime || [];
                    let dataKey = 'learners';
                    let strokeColor = '#3b82f6';
                    let tooltipLabel = 'Total Learners';

                    if (revenueTimeToggle === 'month') {
                      // Generate all months for the selected year
                      const allMonths = [];
                      for (let month = 1; month <= 12; month++) {
                        const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
                        const monthData = chartData?.find(item => item.date === monthKey);
                        allMonths.push({
                          date: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' }),
                          [dataKey]: monthData ? Number(monthData[dataKey]) : 0
                        });
                      }
                      return (
                        <LineChart data={allMonths}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => [value, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    } else if (revenueTimeToggle === 'week') {
                      // Generate all weeks for the selected month with Monday dates
                      const allWeeks = [];
                      const selectedYearNum = parseInt(selectedYear);
                      const selectedMonthNum = parseInt(selectedMonth);
                      
                      for (let week = 1; week <= 4; week++) {
                        // Calculate the Monday date for each week
                        const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                        const firstMonday = new Date(firstDayOfMonth);
                        const dayOfWeek = firstDayOfMonth.getDay();
                        const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                        firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                        
                        // Add weeks to get to the current week
                        const mondayDate = new Date(firstMonday);
                        mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                        
                        const weekKey = `WEEK ${week}`;
                        const weekData = chartData?.find(item => item.week === weekKey);
                        allWeeks.push({
                          week: mondayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                          [dataKey]: weekData ? Number(weekData[dataKey]) : 0
                        });
                      }
                      return (
                        <LineChart data={allWeeks}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip formatter={(value) => [value, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    } else {
                      // Daily view - generate all days of the week for the selected week
                      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      
                      // Calculate the Monday date for the selected week
                      const selectedYearNum = parseInt(selectedYear);
                      const selectedMonthNum = parseInt(selectedMonth);
                      const weekNum = parseInt(selectedWeek.split(' ')[1]);
                      
                      const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                      const firstMonday = new Date(firstDayOfMonth);
                      const dayOfWeek = firstDayOfMonth.getDay();
                      const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                      firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                      
                      const selectedMonday = new Date(firstMonday);
                      selectedMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
                      
                      const allDays = daysOfWeek.map((day, index) => {
                        const currentDate = new Date(selectedMonday);
                        currentDate.setDate(selectedMonday.getDate() + index);
                        
                        // Format current date to match backend format (YYYY-MM-DD)
                        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                        
                        const dayData = realAnalytics?.learnersByDay?.find(item => item.date === dateKey);
                        
                        return {
                          day: `${currentDate.toLocaleDateString('en-US', { weekday: 'short' })} ${currentDate.getDate()}`,
                          [dataKey]: dayData ? Number(dayData[dataKey]) : 0
                        };
                      });
                      return (
                        <LineChart data={allDays}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="day" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                          />
                          <YAxis />
                          <Tooltip formatter={(value) => [value, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    }
                  })()}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'completion':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Completion Rate
                </CardTitle>
                <p className="text-sm text-gray-600 mb-2">
                  Percentage of learners who complete the trail over time
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant={revenueTimeToggle === 'all' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('all')}>Total</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'day' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('day')}>Days</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'week' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('week')}>Weeks</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'month' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('month')}>Months</Button>
                </div>
              </div>
              {/* Period Selector Dropdowns - Only show for specific time periods */}
              {revenueTimeToggle !== 'all' && (
                <div className="flex gap-2 items-center">
                {revenueTimeToggle === 'month' && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {revenueTimeToggle === 'week' && (
                  <>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Jan</SelectItem>
                        <SelectItem value="02">Feb</SelectItem>
                        <SelectItem value="03">Mar</SelectItem>
                        <SelectItem value="04">Apr</SelectItem>
                        <SelectItem value="05">May</SelectItem>
                        <SelectItem value="06">Jun</SelectItem>
                        <SelectItem value="07">Jul</SelectItem>
                        <SelectItem value="08">Aug</SelectItem>
                        <SelectItem value="09">Sep</SelectItem>
                        <SelectItem value="10">Oct</SelectItem>
                        <SelectItem value="11">Nov</SelectItem>
                        <SelectItem value="12">Dec</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                {revenueTimeToggle === 'day' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">Jan</SelectItem>
                          <SelectItem value="02">Feb</SelectItem>
                          <SelectItem value="03">Mar</SelectItem>
                          <SelectItem value="04">Apr</SelectItem>
                          <SelectItem value="05">May</SelectItem>
                          <SelectItem value="06">Jun</SelectItem>
                          <SelectItem value="07">Jul</SelectItem>
                          <SelectItem value="08">Aug</SelectItem>
                          <SelectItem value="09">Sep</SelectItem>
                          <SelectItem value="10">Oct</SelectItem>
                          <SelectItem value="11">Nov</SelectItem>
                          <SelectItem value="12">Dec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const selectedYearNum = parseInt(selectedYear);
                            const selectedMonthNum = parseInt(selectedMonth);
                            const weeks = [];
                            
                            for (let week = 1; week <= 4; week++) {
                              // Calculate the Monday date for each week
                              const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                              const firstMonday = new Date(firstDayOfMonth);
                              const dayOfWeek = firstDayOfMonth.getDay();
                              const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                              firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                              
                              // Add weeks to get to the current week
                              const mondayDate = new Date(firstMonday);
                              mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                              
                              const weekKey = `WEEK ${week}`;
                              const day = mondayDate.getDate();
                              const ordinal = getOrdinalSuffix(day);
                              const weekLabel = `${day}${ordinal}`;
                              weeks.push({ key: weekKey, label: weekLabel });
                            }
                            
                            return weeks.map(({ key, label }) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              )}
            </CardHeader>
            {/* Completion Rate Summary */}
            <div className="px-6 py-4 bg-white">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {realAnalytics?.completionRate?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
            </div>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    let chartData = realAnalytics?.completionRateOverTime || [];
                    let dataKey = 'completionRate';
                    let strokeColor = '#8b5cf6';
                    let tooltipLabel = 'Completion Rate';

                    if (revenueTimeToggle === 'month') {
                      // Generate all months for the selected year
                      const allMonths = [];
                      for (let month = 1; month <= 12; month++) {
                        const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
                        const monthData = chartData?.find(item => item.date === monthKey);
                        allMonths.push({
                          date: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' }),
                          [dataKey]: monthData ? Number(monthData[dataKey]) : 0
                        });
                      }
                      return (
                        <LineChart data={allMonths}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    } else if (revenueTimeToggle === 'week') {
                      // Generate all weeks for the selected month with Monday dates
                      const allWeeks = [];
                      const selectedYearNum = parseInt(selectedYear);
                      const selectedMonthNum = parseInt(selectedMonth);
                      
                      for (let week = 1; week <= 4; week++) {
                        // Calculate the Monday date for each week
                        const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                        const firstMonday = new Date(firstDayOfMonth);
                        const dayOfWeek = firstDayOfMonth.getDay();
                        const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                        firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                        
                        // Add weeks to get to the current week
                        const mondayDate = new Date(firstMonday);
                        mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                        
                        const weekKey = `WEEK ${week}`;
                        const weekData = chartData?.find(item => item.week === weekKey);
                        allWeeks.push({
                          week: mondayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                          [dataKey]: weekData ? Number(weekData[dataKey]) : 0
                        });
                      }
                      return (
                        <LineChart data={allWeeks}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    } else {
                      // Daily view - use actual daily data from backend
                      const dailyData = realAnalytics?.completionRateByDay || [];
                      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      
                      // Calculate the Monday date for the selected week
                      const selectedYearNum = parseInt(selectedYear);
                      const selectedMonthNum = parseInt(selectedMonth);
                      const weekNum = parseInt(selectedWeek.split(' ')[1]);
                      
                      const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                      const firstMonday = new Date(firstDayOfMonth);
                      const dayOfWeek = firstDayOfMonth.getDay();
                      const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                      firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                      
                      const selectedMonday = new Date(firstMonday);
                      selectedMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
                      
                      const allDays = daysOfWeek.map((day, index) => {
                        const currentDate = new Date(selectedMonday);
                        currentDate.setDate(selectedMonday.getDate() + index);
                        
                        // Format current date to match backend format (YYYY-MM-DD)
                        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                        
                        const dayData = dailyData.find(item => item.date === dateKey);
                        
                        return {
                          day: `${currentDate.toLocaleDateString('en-US', { weekday: 'short' })} ${currentDate.getDate()}`,
                          [dataKey]: dayData ? Number(dayData[dataKey]) : 0
                        };
                      });
                      return (
                        <LineChart data={allDays}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="day" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                          />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    }
                  })()}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'dropoff':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-red-600" />
                  Retention Analytics
                </CardTitle>
                <p className="text-sm text-gray-600 mb-2">
                  Number of learners who reached each step over time
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant={revenueTimeToggle === 'all' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('all')}>Total</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'day' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('day')}>Days</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'week' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('week')}>Weeks</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'month' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('month')}>Months</Button>
                </div>
              </div>
              {/* Period Selector Dropdowns - Only show for specific time periods */}
              {revenueTimeToggle !== 'all' && (
                <div className="flex gap-2 items-center">
                  {revenueTimeToggle === 'month' && (
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {revenueTimeToggle === 'week' && (
                    <>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">Jan</SelectItem>
                          <SelectItem value="02">Feb</SelectItem>
                          <SelectItem value="03">Mar</SelectItem>
                          <SelectItem value="04">Apr</SelectItem>
                          <SelectItem value="05">May</SelectItem>
                          <SelectItem value="06">Jun</SelectItem>
                          <SelectItem value="07">Jul</SelectItem>
                          <SelectItem value="08">Aug</SelectItem>
                          <SelectItem value="09">Sep</SelectItem>
                          <SelectItem value="10">Oct</SelectItem>
                          <SelectItem value="11">Nov</SelectItem>
                          <SelectItem value="12">Dec</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {revenueTimeToggle === 'day' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2022">2022</SelectItem>
                            <SelectItem value="2023">2023</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="01">Jan</SelectItem>
                            <SelectItem value="02">Feb</SelectItem>
                            <SelectItem value="03">Mar</SelectItem>
                            <SelectItem value="04">Apr</SelectItem>
                            <SelectItem value="05">May</SelectItem>
                            <SelectItem value="06">Jun</SelectItem>
                            <SelectItem value="07">Jul</SelectItem>
                            <SelectItem value="08">Aug</SelectItem>
                            <SelectItem value="09">Sep</SelectItem>
                            <SelectItem value="10">Oct</SelectItem>
                            <SelectItem value="11">Nov</SelectItem>
                            <SelectItem value="12">Dec</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end">
                        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const selectedYearNum = parseInt(selectedYear);
                              const selectedMonthNum = parseInt(selectedMonth);
                              const weeks = [];
                              
                              for (let week = 1; week <= 4; week++) {
                                // Calculate the Monday date for each week
                                const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                                const firstMonday = new Date(firstDayOfMonth);
                                const dayOfWeek = firstDayOfMonth.getDay();
                                const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                                firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                                
                                // Add weeks to get to the current week
                                const mondayDate = new Date(firstMonday);
                                mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                                
                                const weekKey = `WEEK ${week}`;
                                const day = mondayDate.getDate();
                                const ordinal = getOrdinalSuffix(day);
                                const weekLabel = `${day}${ordinal}`;
                                weeks.push({ key: weekKey, label: weekLabel });
                              }
                              
                              return weeks.map(({ key, label }) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            {/* Retention Summary */}
            <div className="px-6 py-4 bg-white">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {revenueTimeToggle === 'all' 
                    ? `${realAnalytics?.retentionByStep?.[0]?.retentionRate?.toFixed(1) || '0.0'}%`
                    : `${realAnalytics?.retentionByStep?.[0]?.retentionRate?.toFixed(1) || '0.0'}%`
                  }
                </div>
                <div className="text-sm text-gray-600">
                  {revenueTimeToggle === 'all' ? 'Total Retention Rate' : 'Retention Rate'}
                </div>
              </div>
            </div>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realAnalytics?.retentionByStep?.map(item => ({
                    step: item.step,
                    stepTitle: item.stepTitle || `Step ${item.step + 1}`,
                    retentionRate: item.retentionRate,
                    learnersReached: item.learnersReached
                  })) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stepTitle" />
                    <YAxis />
                    <Tooltip formatter={(value, name, props) => {
                      if (name === 'retentionRate') {
                        return [`${value}% (${props.payload.learnersReached} learners)`, 'Retention Rate'];
                      }
                      return [value, name];
                    }} labelFormatter={(label) => label} />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <Line type="monotone" dataKey="retentionRate" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'watchtime':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Watch Time Analytics
                </CardTitle>
                <p className="text-sm text-gray-600 mb-2">
                  Total watch time and engagement over time
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant={revenueTimeToggle === 'all' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('all')}>Total</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'day' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('day')}>Days</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'week' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('week')}>Weeks</Button>
                  <Button size="sm" variant={revenueTimeToggle === 'month' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('month')}>Months</Button>
                </div>
              </div>
                            {/* Period Selector Dropdowns - Only show for specific time periods */}
              {revenueTimeToggle !== 'all' && (
                <div className="flex gap-2 items-center">
                  {revenueTimeToggle === 'month' && (
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {revenueTimeToggle === 'week' && (
                    <>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">Jan</SelectItem>
                          <SelectItem value="02">Feb</SelectItem>
                          <SelectItem value="03">Mar</SelectItem>
                          <SelectItem value="04">Apr</SelectItem>
                          <SelectItem value="05">May</SelectItem>
                          <SelectItem value="06">Jun</SelectItem>
                          <SelectItem value="07">Jul</SelectItem>
                          <SelectItem value="08">Aug</SelectItem>
                          <SelectItem value="09">Sep</SelectItem>
                          <SelectItem value="10">Oct</SelectItem>
                          <SelectItem value="11">Nov</SelectItem>
                          <SelectItem value="12">Dec</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {revenueTimeToggle === 'day' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2022">2022</SelectItem>
                            <SelectItem value="2023">2023</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="01">Jan</SelectItem>
                            <SelectItem value="02">Feb</SelectItem>
                            <SelectItem value="03">Mar</SelectItem>
                            <SelectItem value="04">Apr</SelectItem>
                            <SelectItem value="05">May</SelectItem>
                            <SelectItem value="06">Jun</SelectItem>
                            <SelectItem value="07">Jul</SelectItem>
                            <SelectItem value="08">Aug</SelectItem>
                            <SelectItem value="09">Sep</SelectItem>
                            <SelectItem value="10">Oct</SelectItem>
                            <SelectItem value="11">Nov</SelectItem>
                            <SelectItem value="12">Dec</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end">
                        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const selectedYearNum = parseInt(selectedYear);
                              const selectedMonthNum = parseInt(selectedMonth);
                              const weeks = [];
                              
                              for (let week = 1; week <= 4; week++) {
                                const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                                const firstMonday = new Date(firstDayOfMonth);
                                const dayOfWeek = firstDayOfMonth.getDay();
                                const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                                firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                                
                                const mondayDate = new Date(firstMonday);
                                mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                                
                                weeks.push({
                                  key: `WEEK ${week}`,
                                  label: `${mondayDate.getDate()}${getOrdinalSuffix(mondayDate.getDate())}`
                                });
                              }
                              
                              return weeks.map(({ key, label }) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            {/* Watch Time Summary */}
            <div className="px-6 py-4 bg-white">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {revenueTimeToggle === 'all' 
                    ? `${Number(realAnalytics?.totalWatchTime || 0).toFixed(2)} min`
                    : `${Number(realAnalytics?.totalWatchTime || 0).toFixed(2)} min`
                  }
                </div>
                <div className="text-sm text-gray-600">
                  {revenueTimeToggle === 'all' ? 'Total Watch Time' : 'Watch Time'}
                </div>
              </div>
            </div>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    let chartData = realAnalytics?.watchTimeOverTime || [];
                    let dataKey = 'watchTime';
                    let strokeColor = '#f97316';
                    let tooltipLabel = 'Watch Time';

                    if (revenueTimeToggle === 'month') {
                      // Generate all months for the selected year
                      const allMonths = [];
                      for (let month = 1; month <= 12; month++) {
                        const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
                        const monthData = chartData?.find(item => item.date === monthKey);
                        allMonths.push({
                          date: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' }),
                          [dataKey]: monthData ? Number(monthData[dataKey]) / 60 : 0 // Convert minutes to hours
                        });
                      }
                      return (
                        <LineChart data={allMonths}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => {
                            // Format to show whole numbers or max 1 decimal place
                            const formattedValue = Number(value) < 1 ? Number(value).toFixed(1) : Math.round(Number(value));
                            return `${formattedValue} hrs`;
                          }} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} hrs`, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    } else if (revenueTimeToggle === 'week') {
                      // Generate all weeks for the selected month with Monday dates
                      const allWeeks = [];
                      const selectedYearNum = parseInt(selectedYear);
                      const selectedMonthNum = parseInt(selectedMonth);
                      
                      for (let week = 1; week <= 4; week++) {
                        // Calculate the Monday date for each week
                        const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                        const firstMonday = new Date(firstDayOfMonth);
                        const dayOfWeek = firstDayOfMonth.getDay();
                        const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                        firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                        
                        // Add weeks to get to the current week
                        const mondayDate = new Date(firstMonday);
                        mondayDate.setDate(firstMonday.getDate() + (week - 1) * 7);
                        
                        const weekKey = `WEEK ${week}`;
                        const weekData = chartData?.find(item => item.week === weekKey);
                        allWeeks.push({
                          week: mondayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                          [dataKey]: weekData ? Number(weekData[dataKey]) / 60 : 0 // Convert minutes to hours
                        });
                      }
                      return (
                        <LineChart data={allWeeks}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis tickFormatter={(value) => {
                            // Format to show whole numbers or max 1 decimal place
                            const formattedValue = Number(value) < 1 ? Number(value).toFixed(1) : Math.round(Number(value));
                            return `${formattedValue} hrs`;
                          }} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} hrs`, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    } else {
                      // Daily view - generate all days of the week for the selected week
                      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      
                      // Calculate the Monday date for the selected week
                      const selectedYearNum = parseInt(selectedYear);
                      const selectedMonthNum = parseInt(selectedMonth);
                      const weekNum = parseInt(selectedWeek.split(' ')[1]);
                      
                      const firstDayOfMonth = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                      const firstMonday = new Date(firstDayOfMonth);
                      const dayOfWeek = firstDayOfMonth.getDay();
                      const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
                      firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd);
                      
                      const selectedMonday = new Date(firstMonday);
                      selectedMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
                      
                      const allDays = daysOfWeek.map((day, index) => {
                        const currentDate = new Date(selectedMonday);
                        currentDate.setDate(selectedMonday.getDate() + index);
                        
                        // Format current date to match backend format (YYYY-MM-DD)
                        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                        
                        const dayData = realAnalytics?.watchTimeByDay?.find(item => item.date === dateKey);
                        
                        return {
                          day: `${day.slice(0, 3)} ${currentDate.getDate()}`,
                          [dataKey]: dayData ? Number(dayData[dataKey]) / 60 : 0 // Convert minutes to hours
                        };
                      });
                      
                      return (
                        <LineChart data={allDays}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="day" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                          />
                          <YAxis tickFormatter={(value) => {
                            // Format to show whole numbers or max 1 decimal place
                            const formattedValue = Number(value) < 1 ? Number(value).toFixed(1) : Math.round(Number(value));
                            return `${formattedValue} hrs`;
                          }} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} hrs`, '']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} />
                        </LineChart>
                      );
                    }
                  })()}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trail Analytics</h1>
              <p className="text-gray-600">Detailed insights for your trail performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAnalytics}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAnalytics}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Reset Analytics
            </Button>
          </div>
        </div>
      </div>
      {/* Layout: Sidebar + Main Content */}
      <div className="flex relative gap-x-4 lg:gap-x-8">
        {/* Sidebar */}
        <div className={`bg-white border-r border-gray-200 min-h-screen transition-all duration-300 ${sidebarOpen ? 'w-80' : 'w-16'} ${isMobile ? (sidebarOpen ? 'fixed top-0 left-0 z-[999] h-screen overflow-y-auto' : 'relative') : 'relative overflow-hidden'}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="p-4">
            {/* Toggle Button - aligned to right */}
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2"
              >
                {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
            {/* Content - hidden when collapsed */}
            {sidebarOpen && (
              <>
                {/* Trail Card - matches Profile page design */}
                {trail && (
                  <Card className="mb-6 overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                    <div className="relative">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-gray-200">
                        {getTrailThumbnail(trail) ? (
                          <img 
                            src={getTrailThumbnail(trail)} 
                            alt={trail.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          {trail.status === 'published' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              Draft
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Content */}
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                            {trail.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {trail.description}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{trail.steps.length} steps</span>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                )}
                {/* KPIs */}
                {analytics && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'revenue' ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('revenue')}>
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Revenue</p>
                          <p className="text-lg font-bold text-green-600">${realAnalytics?.totalRevenue?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'learners' ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('learners')}>
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Total Learners</p>
                          <p className="text-lg font-bold text-blue-600">{realAnalytics?.totalLearners || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'completion' ? 'bg-purple-100 border-2 border-purple-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('completion')}>
                      <div className="flex items-center justify-center gap-3">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Completion Rate</p>
                          <p className="text-lg font-bold text-purple-600">{realAnalytics?.completionRate?.toFixed(1) || '0.0'}%</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'dropoff' ? 'bg-red-100 border-2 border-red-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('dropoff')}>
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-red-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Retention Rate</p>
                          <p className="text-lg font-bold text-red-600">{realAnalytics?.retentionByStep?.[0]?.retentionRate?.toFixed(1) || '0.0'}%</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'watchtime' ? 'bg-amber-100 border-2 border-amber-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('watchtime')}>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Watch Time</p>
                          <p className="text-lg font-bold text-amber-600">{Number(realAnalytics?.totalWatchTime || 0).toFixed(2)} min</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0' : isMobile ? 'ml-0' : 'ml-4'} ${isMobile ? 'min-h-screen' : ''} pt-6`}>
          <div className={`mx-auto w-full ${isMobile ? 'max-w-full' : 'max-w-4xl'}`}>
            {renderChart(activeMetric, analytics ? analytics[activeMetric] : [], revenueTimeToggle)}
          </div>
        </div>
      </div>
      {/* Dark overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[998]"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default TrailAnalytics;