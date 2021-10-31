import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';

const IS_CODEGEN = process.argv.join(' ').includes('codegen');

import { merge } from 'lodash';

type Partial<T> = {
    [P in keyof T]?: T[P];
};

interface ConfigGraphQLSchema extends Partial<IExecutableSchemaDefinition<any>> {
    typeDefs?: any[] | string,
    loadFiles?: boolean;
    directives?: any[],
    [key: string]: any;
}

export function createSchema(config: ConfigGraphQLSchema) {
    config.typeDefs = config?.typeDefs || [];
    if (config.loadFiles) {
        const SchemaFiles = loadFilesSync(process.cwd() + '/src/**/*.graphql', { });
        config.typeDefs = config.typeDefs.concat(mergeTypeDefs(
            SchemaFiles, { commentDescriptions: true }
        ))
    }
    config.typeDefs = mergeTypeDefs(config?.typeDefs || [], { commentDescriptions: true });
    config = merge({
        parseOptions: {
            commentDescriptions: true,
        },
        resolverValidationOptions: {
            requireResolversToMatchSchema: IS_CODEGEN ? 'ignore' : 'warn',
        }
    }, config)
    let schema = makeExecutableSchema(config as IExecutableSchemaDefinition<any>);
    for (const directive of (config?.directives || [])) {
        schema = directive.apply(schema);
    }
    return schema;
}


