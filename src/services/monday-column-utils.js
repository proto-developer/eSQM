
export const processStatusColSettings = (settings) => {
    // Transform the stupid format of the status column settings into a more usable format
    return Object.fromEntries(
    Object.keys(settings.labels).map((index) => {
      return [
        settings.labels[index],
        {
          colors: settings.labels_colors[index],
          position: settings.labels_positions_v2[index],
          is_done: settings.done_colors.includes(index),
        },
      ];
    })
  );
};
