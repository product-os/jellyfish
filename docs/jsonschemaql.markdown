JSONSchemaQL
============

The query object contains the following fields:
- where: this is the json schema used to filter data
- select: an object structure listing the fields that you would like to select,
  an asterisk can be used to represent a wildcard
- orderBy: The field that should be used to sort the resulting data
- orderDir: The direction that data should be sorted
- limit: The number of documents the query should be limited to
- skip: The number of documents that should be skipped over, after sorting

A `$options` keyword can be added to any field. The corresponding value should
be a new query object.

The data returned from a field can be used in the nested query object's `where`
value, using the `$eval` keyword. The source date is represent as `source`.
The data returned would contain the result of the sub-query instead of the
original canonical value.
For example, if you want to find the corresponding document for an `actor` using
its `id` value, you would make a query that looks like this:

```
where: {
    type: object
    properties: {
        actor: {
            $options: {
                where: {
                    type: object
                    properties: {
                        id: {
                            const: {
                                $eval: 'source'
                            }
                        }
                    }
                }
            }
        }
    }
}
```

If you want to restrict the entire result set using the "expansion" a different
syntax is required, similar to the pine client, e.g.

```
await sdk.pine.get({
	resource: 'application',
	options: {
		$select: '*',
		$filter: {
			owns__device: {
					$any: {
							$alias: 'd',
							$expr: {
								d: { device_name: 'delicate-water' }
							}
					}
			 }
    }
})
```


`has attached element` is a materialised field that represents a link/verb/edge
between two nodes. It can only have one property ($options)

```
where: {
    type: object
    properties: {
        type: {
            const: card
        }
        actor: {
            $options: {
                where: {
                    type: object
                    properties: {
                        id: {
                            const: {
                                $eval: 'source'
                            }
                        }
                    }
                },
                select: [
                    slug
                    name
                    data: [
                        email
                    ]
                ]
            }
        },
        has attached element: {
            $options: {
                where: {
                    type: object
                    properties: {
                        type: {
                            const: message
                        }
                        actor: {
                            $options: {
                                where: {
                                    type: object
                                    properties: {
                                        id: {
                                            const: {
                                                $eval: 'source'
                                            }
                                        }
                                        is member of: {
                                            $options: {
                                                select: [ slug, name ]
                                            }
                                        }
                                    }
                                },
                                select: [
                                    slug
                                ]
                            }
                        },
                    }
                },
                orderBy: created_at
                limit: 20
            }
        }
    }
}
select: *
orderBy: created_at
orderDir: asc
limit: 50
skip: 10
```
