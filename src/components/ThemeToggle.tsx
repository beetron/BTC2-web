/**
 * Theme Toggle Component
 */

import { Button, Tooltip } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useMantineColorScheme } from "@mantine/core";

export const ThemeToggle: React.FC = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <Tooltip
      label={`Switch to ${colorScheme === "dark" ? "light" : "dark"} mode`}
      withArrow
      position="bottom"
    >
      <Button
        onClick={() => toggleColorScheme()}
        variant="default"
        size="md"
        radius="md"
      >
        {colorScheme === "dark" ? (
          <IconSun size={18} />
        ) : (
          <IconMoon size={18} />
        )}
      </Button>
    </Tooltip>
  );
};

export default ThemeToggle;
