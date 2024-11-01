

export class MondayNotificationService {
  constructor(client) {
    this.client = client;
  }

  async getPeopleFromTeam(team_id) {
    const query = `
      query {
        teams(ids: [${team_id}]) {
          users {
            id
          }
        }
    }`;
    const result =  await this.client.api(query);
    const users = result.data.teams[0].users;
    const userIds = users.map(user => user.id);
    return userIds;
  }

  async sendNotification(item_id, user_id, message) {
    const query = `
      mutation {
        create_notification(
          user_id: "${user_id}",
          target_id: "${item_id}",
          target_type: Project,
          text: "${message.replace(/"/g, '\\"')}"
        ) {
          id
        }
      }
    `;
    const response =  await this.client.api(query);
    if(!response.data.create_notification.id) {
      console.error("Failed to send notification", response);
    }
  }

  async sendNotificationToMondayItem(item_id, persons_and_teams, message) {
    // TODO: look at making API calls in parallel

    const userIds = [];
    for (const personOrTeam of persons_and_teams) {
        if (personOrTeam.kind === 'team') {
            const teamUsers = await this.getPeopleFromTeam(personOrTeam.id);
            userIds.push(...teamUsers);
        } else if (personOrTeam.kind === 'person') {
            userIds.push(personOrTeam.id);
        }
    }

    const uniqueUserIds = Array.from(new Set(userIds.map(String)));

    for (const userId of uniqueUserIds) {
      await this.sendNotification(item_id, userId, message);
    }
  }
};
