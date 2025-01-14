import React, { useState, useEffect } from 'react';
import { Link, useParams, Redirect } from 'react-router-dom';
import { Form, Message, Icon, Button, Card } from 'semantic-ui-react';
import _ from 'lodash';

import Page from '../components/layout/Page';
import TextAttribute from '../components/EditableAttribute/TextAttribute';
import EnumAttribute from '../components/EditableAttribute/EnumAttribute';
import BooleanAttribute from '../components/EditableAttribute/BooleanAttribute';
import DateAttribute from '../components/EditableAttribute/DateAttribute';
import '../css/Profile.css';
import {
  getMemberByID,
  getMemberEnumOptions,
  getMemberPermissionsByID,
  getMemberSchemaTypes,
  updateMember,
  createMember,
} from '../utils/apiWrapper';
import { requiredFields } from '../utils/consts';

/**
 * @constant
 * @type {number}
 */
const SUCCESS_MESSAGE_POPUP_TIME_MS = 4000;

/**
 * Checks if the given API responses were successful
 * @param  {...any} responses Any amount of response objects
 */
const areResponsesSuccessful = (...responses) => {
  let success = true;
  responses.forEach((response) => {
    if (response == null || response.data == null || !response.data.success)
      success = false;
  });

  return success;
};

const Profile = () => {
  const { memberID } = useParams();
  const newUser = memberID === 'new';
  const [newUserID, setNewUserID] = useState(false);

  // Upstream user is the DB version. Local user captures local changes made to the user.
  const [upstreamUser, setUpstreamUser] = useState({});
  const [localUser, setLocalUser] = useState({});
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [enumOptions, setEnumOptions] = useState({});
  const [schemaTypes, setSchemaTypes] = useState({});
  const [userPermissions, setUserPermissions] = useState({
    view: [],
    edit: [],
  });

  useEffect(() => {
    async function getUserData() {
      if (memberID == null) return;

      const responses = [];

      let memberDataResponse;
      if (!newUser) {
        memberDataResponse = await getMemberByID(memberID);
        responses.push(memberDataResponse);
      }

      const memberPermissionResponse = await getMemberPermissionsByID(memberID);
      const memberSchemaResponse = await getMemberSchemaTypes();
      const enumOptionsResponse = await getMemberEnumOptions();
      responses.push(
        enumOptionsResponse,
        memberSchemaResponse,
        memberPermissionResponse,
      );

      if (!areResponsesSuccessful(...responses)) {
        setErrorMessage('An error occurred while retrieving member data.');
        return;
      }

      if (!newUser) {
        setUpstreamUser(memberDataResponse.data.result);
        setLocalUser(memberDataResponse.data.result);
      }
      setUserPermissions(memberPermissionResponse.data.result);
      setSchemaTypes(memberSchemaResponse.data.result);
      setEnumOptions(enumOptionsResponse.data.result);
      setErrorMessage(null);
    }

    getUserData();
  }, [memberID, newUser]);

  // Returns true if the member attribute is of the given type.
  // Type is a string defined by mongoose. See https://mongoosejs.com/docs/schematypes.html
  const isOfType = (attribute, type) => {
    if (!schemaTypes || !type || !schemaTypes[type]) return false;

    return schemaTypes[type].includes(attribute);
  };

  const onAttributeChange = (value, attributeLabel) => {
    setLocalUser({
      ...localUser,
      [attributeLabel]: value,
    });
  };

  const createUpdatedUser = () => {
    const updatedUser = {};
    userPermissions.edit.forEach((field) => {
      updatedUser[field] = localUser[field];
    });

    return updatedUser;
  };

  const setTemporarySuccessMessage = (contents) => {
    setSuccessMessage(contents);
    setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_POPUP_TIME_MS);
  };

  const submitChanges = async () => {
    let missingFields = false;
    requiredFields.forEach((field) => {
      if (!localUser[field]) {
        missingFields = true;
      }
    });
    if (missingFields) return;

    const result = newUser
      ? await createMember(createUpdatedUser())
      : await updateMember(createUpdatedUser(), upstreamUser._id);
    if (!areResponsesSuccessful(result)) {
      setErrorMessage(
        `An error occured${
          result &&
          result.error &&
          result.error.response &&
          result.error.response.data
            ? `: ${result.error.response.data.message}`
            : '.'
        }`,
      );
      setSuccessMessage(null);
    } else {
      setTemporarySuccessMessage(newUser ? 'User Created' : 'User updated');
      setErrorMessage(null);
      setUpstreamUser(result.data.result);
      if (newUser) setNewUserID(result.data.result._id);
    }
  };

  return (
    <Page
      title={
        <>
          <Link to="/">Members</Link> / {upstreamUser.firstName}{' '}
          {upstreamUser.lastName}
        </>
      }
    >
      {/* Redirects to the new member page immediately after creating and getting a success response */}
      {newUserID && <Redirect to={`/member/${newUserID}`} />}
      <Card fluid>
        <Card.Content>
          <Card.Header>Profile</Card.Header>
          <Form fluid className="profile-form" onSubmit={submitChanges}>
            <div className="form-grid">
              {
                // Main content
                userPermissions.view.map((attribute) => {
                  if (isOfType(attribute, 'Number')) {
                    return (
                      <TextAttribute
                        type="number"
                        value={localUser[attribute]}
                        key={attribute}
                        attributeLabel={attribute}
                        className="attribute"
                        onChange={onAttributeChange}
                        isDisabled={!userPermissions.edit.includes(attribute)}
                        isRequired={requiredFields.includes(attribute)}
                      />
                    );
                  }

                  if (isOfType(attribute, 'Enum')) {
                    return (
                      <EnumAttribute
                        value={localUser[attribute]}
                        valueOptions={enumOptions[attribute]}
                        key={attribute}
                        attributeLabel={attribute}
                        className="attribute"
                        onChange={onAttributeChange}
                        isDisabled={!userPermissions.edit.includes(attribute)}
                      />
                    );
                  }

                  if (isOfType(attribute, 'Boolean')) {
                    return (
                      <BooleanAttribute
                        value={localUser[attribute]}
                        key={attribute}
                        attributeLabel={attribute}
                        className="attribute"
                        onChange={onAttributeChange}
                        isDisabled={!userPermissions.edit.includes(attribute)}
                      />
                    );
                  }

                  if (isOfType(attribute, 'Date')) {
                    return (
                      <DateAttribute
                        value={Date.parse(localUser[attribute])}
                        key={attribute}
                        attributeLabel={attribute}
                        onChange={onAttributeChange}
                        className="attribute"
                        isDisabled={!userPermissions.edit.includes(attribute)}
                        isRequired={requiredFields.includes(attribute)}
                      />
                    );
                  }

                  if (isOfType(attribute, 'String')) {
                    return (
                      <TextAttribute
                        type="text"
                        value={localUser[attribute]}
                        attributeLabel={attribute}
                        className="attribute"
                        key={attribute}
                        onChange={onAttributeChange}
                        isDisabled={!userPermissions.edit.includes(attribute)}
                        isRequired={requiredFields.includes(attribute)}
                      />
                    );
                  }

                  return <div key={attribute} />;
                })
              }
            </div>
            {
              // Message displayed upon successfully updating member
              successMessage ? (
                <div className="profile-alert">
                  <Message icon big positive>
                    <Icon name="thumbs up" />
                    <Message.Content>
                      <Message.Header>
                        {newUser ? 'Create User' : 'Update'} Succeeded!
                      </Message.Header>
                      {successMessage}
                    </Message.Content>
                  </Message>
                </div>
              ) : (
                <div />
              )
            }

            {
              // Message displayed upon receiving an error response
              errorMessage ? (
                <div className="profile-alert">
                  <Message className="profile-alert" icon big negative>
                    <Icon name="warning circle" />
                    <Message.Content>
                      <Message.Header>
                        {newUser ? 'Create User' : 'Update'} Failed!
                      </Message.Header>
                      {errorMessage}
                    </Message.Content>
                  </Message>
                </div>
              ) : (
                <div />
              )
            }

            {userPermissions.edit.length > 0 ? (
              <>
                <Button
                  size="big"
                  id="submit-button"
                  disabled={_.isEqual(upstreamUser, localUser)}
                  type="large"
                  onClick={submitChanges}
                >
                  {newUser ? 'Create User' : 'Update'}
                </Button>
              </>
            ) : (
              <div />
            )}
          </Form>
        </Card.Content>
      </Card>
    </Page>
  );
};

export default Profile;
