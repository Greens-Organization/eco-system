'use client';

import { Tooltip, TooltipTrigger,TooltipContent,TooltipPositioner } from '@pack/design-system/components/ui/base-tooltip';
import { Avatar,AvatarFallback,AvatarImage } from '@pack/design-system/components/ui/base-avatar';

type PresenceAvatarProps = {
  info?: Liveblocks['UserMeta']['info'];
};

const PresenceAvatar = ({ info }: PresenceAvatarProps) => (
  <Tooltip >
    <TooltipTrigger>
      <Avatar className="h-7 w-7 bg-secondary ring-1 ring-background">
        <AvatarImage src={info?.avatar} alt={info?.name} />
        <AvatarFallback className="text-xs">
          {info?.name?.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
    </TooltipTrigger>
    <TooltipPositioner collisionPadding={4}>
    <TooltipContent >
      <p>{info?.name ?? 'Unknown'}</p>
    </TooltipContent>
    </TooltipPositioner>
  </Tooltip>
);

export const AvatarStack = () => {
  const self = useSelf();
  const hasMoreUsers = others.length > 3;

  return (
    <div className="-space-x-1 flex items-center px-4">
      {others.slice(0, 3).map(({ connectionId, info }) => (
        <PresenceAvatar key={connectionId} info={info} />
      ))}

      {hasMoreUsers && (
        <PresenceAvatar
          info={{
            name: `+${others.length - 3}`,
            color: 'var(--color-muted-foreground)',
          }}
        />
      )}

      {self && <PresenceAvatar info={self.info} />}
    </div>
  );
};
