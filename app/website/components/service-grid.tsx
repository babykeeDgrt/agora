import { motion } from "framer-motion";

import { ServiceCard } from "@/components/service-card";
import type { Service } from "@/store/marketplace";

export function ServiceGrid({
  services,
  isLoading,
  emptyMessage,
}: {
  services: Service[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  if (isLoading && services.length === 0) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[360px] animate-pulse rounded-[2rem] border border-border bg-background"
          />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-border bg-background px-4 py-16 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <motion.div layout className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </motion.div>
  );
}
