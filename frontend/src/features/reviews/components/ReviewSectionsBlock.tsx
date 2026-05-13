import { ReviewSection } from "@/features/reviews/components/ReviewSection";
import type { ReviewKind } from "@/types/review";

interface Props {
  kind: ReviewKind;
  targetId: number;
}

export function ReviewSectionsBlock({ kind, targetId }: Props) {
  return (
    <div className="space-y-10">
      <ReviewSection kind={kind} targetId={targetId} sort="popular" />
      <hr
        className="h-px border-0 bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />
      <ReviewSection kind={kind} targetId={targetId} sort="recent" />
    </div>
  );
}
