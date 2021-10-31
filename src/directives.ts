
// @ts-ignore
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { mergeSchemas } from '@graphql-tools/schema';

import { parseResolveInfo } from 'graphql-parse-resolve-info';

import { DocumentNode, DirectiveDefinitionNode, NamedTypeNode, graphql } from 'graphql';
import { gql } from 'apollo-server-express';


export { MapperKind }
export interface DirectiveDeclarations {
    name: string;
    locations: MapperKind[];
    args: {
        name: string;
        type: string;
        defaultValue?: any;
    }[];
}

export function GraphQLDirective(
    typeDefs: DocumentNode | string, 
    callback: (
        source: any,
        args: any,
        context: any,
        info: any,
        resolve: any,
    ) => any
) {
    if (typeof typeDefs == "string") {
        typeDefs = gql(typeDefs);
    }
    const declarations: DirectiveDeclarations[] = [];
    for (const def of (typeDefs.definitions as DirectiveDefinitionNode[])) {
        const name = def.name.value;
        const args = (def.arguments || []).map(o => ({
            name: o.name.value,
            type: (o.type as NamedTypeNode).name.value,
            defaultValue: o.defaultValue,
        }));
        // @ts-ignore
        const locations = def.locations.map(o => MapperKind[o.value]);
        declarations.push({
            name,
            args,
            locations
        })
    }
    return {
        typeDefs,
        apply(schema: any) {
            schema = mergeSchemas({
                schemas: [schema],
                typeDefs,
            })
            for (const declaration of declarations) {
                const cb = function(fieldConfig: any) {
                    const directive = getDirective(schema, fieldConfig, declaration.name)?.[0];
                    if (directive) {
                        if (fieldConfig.resolve) {
                            const resolve = fieldConfig.resolve;
                            fieldConfig.resolve = async function(source: any, args: any, context: any, info: any) {
                                let res = callback(source, args, context, info, resolve);
                                if (res != undefined) {
                                    if (res instanceof Promise) res = await res;
                                    return res;
                                }
                                return await resolve(source, args, context, info)
                            }
                        }
                    } else {
                        if (fieldConfig.resolve) {
                            const resolve = fieldConfig.resolve;
                            fieldConfig.resolve = async function(source: any, args: any, context: any, info: any) {
                                // console.log(info);
                                // @ts-ignore
                                if (info?.fieldNodes?.[0]?.directives?.length > 0) {
                                    let dir = info.fieldNodes[0].directives.find(
                                        (o: any) => o.name.value == declaration.name
                                    );
                                    if (dir) {
                                        const typeMap = schema.getTypeMap();
                                        const name = dir.name.value;
                                        const args2 = Object.assign({}, ...dir.arguments.map((o: any) => ({ 
                                            [o.name.value]: typeMap[
                                                o.value.kind.split('Value').slice(0, -1)
                                            ].serialize(
                                                o.value.value
                                            )
                                        })));
                                        let res = callback.call({
                                            name,
                                            fieldArgs: args,
                                        }, source, args2, context, info, resolve);
                                        if (res != undefined) {
                                            if (res instanceof Promise) res = await res;
                                            return res;
                                        }
                                        return await resolve(source, args, context, info)

                                    }
                                }
                                return await resolve(source, args, context, info)
                            }
                        }
                    }
                    return fieldConfig;
                }
                schema = mapSchema(schema, Object.fromEntries(
                    declaration.locations.map(kind => [
                        kind, cb
                    ])
                ))
            }
            return schema;
        }
    }
}





// import { createSchema } from '../../graphql/schema';

// export const Pagination = GraphQLDirective(gql`
//     directive @page(n: Int = 1, size: Int) on QUERY | FIELD | FIELD_DEFINITION
//     directive @pagination(page: Int, size: Int) on FIELD | FIELD_DEFINITION
// `, function(source, args, context, info, resolve) {
//     console.log('pagination', args);
//     context.page = args.page || args.n;
//     context.pageSize = args.size;
// })

// export const Order = GraphQLDirective(gql`
//     directive @order(
//         """
//         ascending order
//         """
//         asc: String, 
//         """
//         descending order
//         """
//         desc: String,
//         """
//         random order
//         """
//         random: String
//     ) on FIELD
// `, function(source, args, context, info, resolve) {
//     context.order = Object.assign(context.order || {}, {
//         [args.asc || args.desc]: args.asc ? 1 : -1
//     })
//     console.log(context.order);
// })

// let schema = createSchema({
//     directives: [
//         Pagination
//     ]
// })

// graphql(schema, `
// query {
//     posts @page(n: 5, size: 4) {
//         title
//     }
// }
// `).then(console.log);