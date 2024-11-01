import initMondayClient from "monday-sdk-js";
// import * as Sentry from "@sentry/node";
import logger from "../helpers/logger.js";

const TAG = "monday-service";

const itemQueryBody = `
id
name
url
board {
  id
  name
}
column_values {
  id
  text
  column {
    settings_str
    title
    type
  }
  ... on MirrorValue {
  mirrored_items {
    linked_item {
            column_values(ids: ["people__1", "people_1__1"]) {
              ... on PeopleValue {
                persons_and_teams {
                id}}}}
  }
  }
  ... on StatusValue {
    label
  }
  ... on PeopleValue {
    persons_and_teams { id kind }
  }
  ... on BoardRelationValue {
    linked_item_ids
  }
  ... on CheckboxValue {
    checked
  }
  ... on CreationLogValue {
    created_at
    creator { id name }
  }
}
`;

const mapItemToObject = (item) => {
  const itemData = {
    id: item.id,
    name: item.name,
    url: item.url,
    column_values: {},
    column_settings: {},
    raw_data: item,
    board: item.board,
  };
  item.column_values.forEach((column) => {
    itemData.column_values[column.id] = column;
  });
  item.column_values.forEach((column) => {
    if (column.column?.settings_str) {
      itemData.column_settings[column.id] = JSON.parse(
        column.column.settings_str
      );
    }
  });
  return itemData;
};

export const changeColumnValue = async (
  client,
  boardId,
  itemId,
  columnId,
  value
) => {
  const query = `
    mutation change_column_value($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
      change_simple_column_value(
        item_id: $itemId
        board_id: $boardId
        column_id: $columnId
        value: $value
      ) {
        id
      }
    }
  `;
  const variables = { boardId, itemId, columnId, value };

  const response = await client.api(query, { variables });
  return response;
};

export const changeColumnValueMultiple = async (
  client,
  boardId,
  itemId,
  columnValues
) => {
  const query = `
    mutation change_column_value($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) {
        ${itemQueryBody}
      }
    }
  `;
  const variables = {
    boardId,
    itemId,
    columnValues: JSON.stringify(columnValues),
  };

  const response = await client.api(query, { variables });

  // logger.info("changeColumnValueMultiple", TAG, {
  //   error: response.error,
  //   hasData: !!response.data,
  // });

  return {
    item: mapItemToObject(response.data.change_multiple_column_values),
  };
};

export const loadItemToObject = async (client, itemId) => {
  const data = await loadItemsToObject(client, [itemId]);
  if (data.length === 0) {
    return {};
  }
  return data[0];
};

export const loadItemsToObject = async (client, itemIds) => {
  const query = `
    query($itemIds: [ID!]!) {
      items (ids: $itemIds) {
        ${itemQueryBody}
      }
    }
  `;
  const variables = { itemIds };
  const response = await client.api(query, { variables });
  // if (response.errors) {
  //   Sentry.captureException(
  //     new Error(`Error loading items: ${JSON.stringify(response.errors)}`)
  //   );
  //   return [];
  // }
  const items = response.data.items;
  const data = items.map(mapItemToObject);
  return data;
};

export const createItem = async (client, boardId, itemName, columnValues) => {
  const query = `
  mutation create_item($boardId: ID!, $itemName: String!, $columnValues: JSON) {
    create_item(
      board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
      ) {
        id
        url
      }
    }
    `;
  const variables = {
    boardId,
    itemName,
    columnValues: JSON.stringify(columnValues),
  };

  const response = await client.api(query, { variables });
  logger.info("createItem", TAG, {
    response,
    boardId,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });
  return response.data.create_item;
};

export const getConnectedItemColValues = async (
  client,
  itemId,
  connectBoardsColId
) => {
  // Load an array of values from a column connected to the current item

  // Old Query
  //   const query = `
  //     query ($itemId: ID!, $connectBoardsColId: String!, $statusColId: String!) {
  //     items (ids: [$itemId]) {
  //      column_values(ids: [$connectBoardsColId]){
  //       id
  //       ...on BoardRelationValue{
  //         linked_items{
  //           column_values(ids: [$statusColId]){
  //             text
  //           }
  //         }
  //       }
  //     }
  //    }
  // }
  // `;

  // New Query
  const query = `
    query ($itemId: ID!, $connectBoardsColId: String!) {
    items (ids: [$itemId]) {
     column_values(ids: [$connectBoardsColId]){
      id
      ...on BoardRelationValue{
        linked_items{
          id
          column_values(ids: ["status__1"]){
            text
          }
        }
      }
    }
   }
}
  `;

  const response = await client.api(query, {
    variables: { itemId, connectBoardsColId },
  });

  if (response.errors) {
    // Sentry.captureException(
    //   new Error(
    //     `Error loading connected items: ${JSON.stringify(response.errors)}`
    //   )
    // );

    console.error(
      "Error loading connected items",
      JSON.stringify(response.errors)
    );

    return [];
  }

  const valueArr = response.data.items[0].column_values[0].linked_items.map(
    (item) => {
      return item.column_values[0].text;
    }
  );
  const valueMap = response.data.items[0].column_values[0].linked_items.reduce(
    (acc, item) => {
      acc[item.id] = item.column_values[0].text;
      return acc;
    },
    {}
  );

  return {
    valueArr,
    valueMap,
  };
};
