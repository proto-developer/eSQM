export const getUserDetails = async (client, userId) => {
  const query = `
        query ($userIds: [ID!]!){
            users(ids: $userIds) {
                id
                teams { id }
                name
                email
            }
        }
    `;

  const response = await client.api(query, {
    variables: { userIds: [userId] },
  });
  // console.log("User details", response);
  return response.data.users[0];
};
