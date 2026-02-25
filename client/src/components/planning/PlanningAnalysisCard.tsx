import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PlanningAnalysis } from "@/lib/api";

interface PlanningAnalysisCardProps {
  analysis: PlanningAnalysis;
  index: number;
}

export function PlanningAnalysisCard({ analysis, index }: PlanningAnalysisCardProps) {
  const thumbnail = analysis.generatedExteriorUrl || analysis.propertyImageUrl;
  const date = new Date(analysis.createdAt).toLocaleDateString();

  const getStatusLabel = () => {
    switch (analysis.status) {
      case 'pending': return 'Pending';
      case 'analyzing': return 'Analyzing...';
      case 'searching': return 'Searching...';
      case 'awaiting_selection': return 'Select Option';
      case 'generating': return 'Generating...';
      case 'completed': return 'Complete';
      case 'failed': return 'Failed';
      default: return analysis.status;
    }
  };

  const getStatusColor = () => {
    switch (analysis.status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'awaiting_selection': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const formatModificationType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Link href={`/planning/${analysis.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <div className="group cursor-pointer">
          <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-muted mb-4 border border-white/[0.06] shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/10 group-hover:scale-[1.02] ring-offset-background group-hover:ring-2 ring-primary/50">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 z-10 transition-opacity group-hover:opacity-40" />
            
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt="Property" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Home className="w-12 h-12 opacity-50" />
              </div>
            )}
            
            <div className="absolute top-3 right-3 z-20">
              <Badge className={`backdrop-blur-md border ${getStatusColor()}`}>
                {getStatusLabel()}
              </Badge>
            </div>

            {analysis.selectedModification && (
              <div className="absolute bottom-3 left-3 z-20">
                <Badge variant="secondary" className="backdrop-blur-md bg-black/40 border-white/10 text-white">
                  {formatModificationType(analysis.selectedModification)}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-start">
              <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {analysis.propertyAnalysis?.propertyType 
                  ? `${analysis.propertyAnalysis.propertyType.charAt(0).toUpperCase()}${analysis.propertyAnalysis.propertyType.slice(1).replace('-', ' ')} Property`
                  : 'Property Analysis'}
              </h3>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {analysis.postcode && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {analysis.postcode}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {date}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
