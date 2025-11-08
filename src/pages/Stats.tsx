import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';

export default function Stats() {
  return (
    <div className="pb-20 pt-8 px-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Statistics</h1>
      
      <div className="space-y-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Progress Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Visual charts showing your improvement trends will appear here
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Habit Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Analyze your good and bad habit patterns over time
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Weekly Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              See your weekly progress and consistency metrics
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-secondary/30 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          Statistics and charts will be generated based on your event logs and progress tracking
        </p>
      </div>
    </div>
  );
}
