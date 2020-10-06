/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {APIClient} from '@wireapp/api-client';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {Notification} from '@wireapp/api-client/dist/notification';

import {Logger, getLogger} from 'Util/Logger';
import {WebSocketClient} from '@wireapp/api-client/dist/tcp/';
import {WEBSOCKET_STATE} from '@wireapp/api-client/dist/tcp/ReconnectingWebsocket';

import {WarningsViewModel} from '../view_model/WarningsViewModel';

export type OnNotificationCallback = (data: Notification) => void;

export class WebSocketService {
  private readonly apiClient: APIClient;
  private readonly logger: Logger;

  public clientId?: string;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
    this.logger = getLogger('WebSocketService');
  }

  disconnect() {
    this.logger.info('Disconnecting websocket');
    this.apiClient.disconnect();
  }

  /**
   * Establish the WebSocket connection.
   * @param onNotification Function to be called on incoming notifications
   * @returns Resolves once the WebSocket connects
   */
  async connect(onNotification: OnNotificationCallback, onBeforeConnect: () => Promise<void>): Promise<void> {
    this.apiClient.context.clientId = this.clientId;
    this.apiClient.on(APIClient.TOPIC.ON_LOGOUT, async () => {
      this.disconnect();
    });
    this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, onNotification as any);

    this.logger.info(`Connecting WebSocket with clientID "${this.apiClient.clientId}"`);
    // Note: `connect()` should only resolve after `onBeforeConnect()` is executed successfully
    // We need to wrap this into a plain Promise because `reconnecting-websocket` doesn't give a handle
    // to wait for the execution (connection lost on RWS constructor)
    await new Promise((resolve, reject) =>
      this.apiClient.connect(async () => {
        try {
          await onBeforeConnect();
          resolve();
        } catch (error) {
          reject(error);
        }
      }),
    );

    this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_STATE_CHANGE, (state: WEBSOCKET_STATE) => {
      this.logger.info(`Websocket state change: ${WEBSOCKET_STATE[state]}`);
      switch (state) {
        case WEBSOCKET_STATE.CONNECTING: {
          amplify.publish(WebAppEvents.WARNING.DISMISS, WarningsViewModel.TYPE.NO_INTERNET);
          amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
          return;
        }
        case WEBSOCKET_STATE.CLOSING: {
          return;
        }
        case WEBSOCKET_STATE.CLOSED: {
          amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.NO_INTERNET);
          return;
        }
        case WEBSOCKET_STATE.OPEN: {
          amplify.publish(WebAppEvents.CONNECTION.ONLINE);
          amplify.publish(WebAppEvents.WARNING.DISMISS, WarningsViewModel.TYPE.NO_INTERNET);
          amplify.publish(WebAppEvents.WARNING.DISMISS, WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
        }
      }
    });
  }
}
