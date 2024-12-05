export const getMirrorColumnStatus = async (mondayClient, itemId) => {
  const query = `
        query {
            items(ids:[${itemId}]) {
                column_values {
                    type
                    ... on MirrorValue {
                        display_value
                        id
                    }
                }
            }
        }
    `;

  try {
    const res = await mondayClient.api(query);

    // Separate the mirror columns from the rest
    const mirrorCol = res.data.items[0].column_values.filter(
      (col) => col.type === "mirror"
    );

    // Create a new array with only the display value
    const mirrorColValues = mirrorCol.map((col) => col.display_value);

    // Separate the values from the string to separate statuses
    const separatedValues = mirrorColValues
      .map((item) => item.split(", "))
      .flat()
      .map((item) => item);
    return separatedValues;
  } catch (err) {
    console.log("Debug Err", err);
    return [];
  }
};
