

export const getBoardItemHighestNumber = async (mondayClient, boardId, column) => {
    const query = `
        query {
            boards (ids: ["${boardId}"]) {
                items_page(limit: 1, query_params: {
                    rules:[{column_id:"${column}", compare_value:"", operator: is_not_empty}],
                order_by:[{column_id:"${column}", direction: desc}]}
                ) {
                    items{
                        column_values(ids: ["${column}"]) {
                            text
                        }
                    }
                }
            }
        }
    `;
    let res = await mondayClient.api(query);
    return res.data.boards[0].items_page.items[0].column_values[0].text;
    }
