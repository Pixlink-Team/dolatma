interface PublishStatusBadgeProps {
  published: boolean;
  className?: string;
}

/** Draft/published badges are retired; always a no-op. */
export function PublishStatusBadge(_props: PublishStatusBadgeProps) {
  void _props;
  return null;
}
