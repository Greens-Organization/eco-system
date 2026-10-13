<script lang="ts">
import { Badge } from '@pack/design-system/components/ui/badge';

interface Props {
  status: string;
  label: string;
}

let { status, label }: Props = $props();

const variant = $derived(
  status === 'active'
    ? 'default'
    : status === 'inactive'
      ? 'outline'
      : 'secondary'
);
</script>

<Badge {variant}>{label}</Badge>
