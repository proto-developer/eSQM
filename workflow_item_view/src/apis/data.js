import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();
monday.setApiVersion("2024-07");

export const getItemState = async (itemId, boardId) => {
  const query = `
    query {
      boards (ids: ["${boardId}"]) {
        id
        name
      }
      items (ids: ["${itemId}"]) {
        name
        column_values (ids: ["status__1"]){
          text
        }
      }
    }
  `;
  let res = await monday.api(query);

  // Parse and return a simplified object
  return {
    board: res.data.boards[0],
    item: {
      id: itemId,
      name: res.data.items[0].name,
      state: res.data.items[0].column_values[0].text,
    },
  };
};
