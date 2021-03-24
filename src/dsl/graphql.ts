/**
 * Pact GraphQL module.
 *
 * @module GraphQL
 */
import { isNil, extend, omitBy, isUndefined } from "lodash"
import gql from "graphql-tag"
import { Interaction, InteractionState } from "./interaction"
import { regex } from "./matchers"
import GraphQLQueryError from "../errors/graphQLQueryError"
import ConfigurationError from "../errors/configurationError"

export interface GraphQLVariables {
  [name: string]: unknown
}

const escapeSpace = (s: string) => s.replace(/\s+/g, "\\s*")

const escapeRegexChars = (s: string) =>
  // eslint-disable-next-line no-useless-escape
  s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")

const escapeGraphQlQuery = (s: string) => escapeSpace(escapeRegexChars(s))

/**
 * GraphQL interface
 */
export class GraphQLInteraction extends Interaction {
  protected operation?: string | null = undefined

  protected variables?: GraphQLVariables = undefined

  protected query: string

  /**
   * The type of GraphQL operation. Generally not required.
   */
  public withOperation(operation: string | null): this {
    this.operation = operation

    return this
  }

  /**
   * Any variables used in the Query
   */
  public withVariables(variables: GraphQLVariables): this {
    this.variables = variables

    return this
  }

  /**
   * The actual GraphQL query as a string.
   *
   * NOTE: spaces are not important, Pact will auto-generate a space-insensitive matcher
   *
   *  e.g. the value for the "query" field in the GraphQL HTTP payload:
   *  '{ "query": "{
   *        Category(id:7) {
   *          id,
   *          name,
   *          subcategories {
   *            id,
   *            name
   *          }
   *        }
   *     }"
   *  }'
   */
  public withQuery(query: string): this {
    if (isNil(query)) {
      throw new ConfigurationError("You must provide a GraphQL query.")
    }

    try {
      gql(query)
    } catch (e) {
      throw new GraphQLQueryError(`GraphQL Query is invalid: ${e.message}`)
    }

    this.query = query

    return this
  }

  /**
   * Returns the interaction object created.
   */
  public json(): InteractionState {
    if (isNil(this.query)) {
      throw new ConfigurationError("You must provide a GraphQL query.")
    }
    if (isNil(this.state.description)) {
      throw new GraphQLQueryError(
        "You must provide a description for the query."
      )
    }

    this.state.request = extend(
      {
        body: omitBy(
          {
            operationName: this.operation,
            query: regex({
              generate: this.query,
              matcher: escapeGraphQlQuery(this.query),
            }),
            variables: this.variables,
          },
          isUndefined
        ),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
      this.state.request
    )

    return this.state
  }
}
