'use client';
import { JSX } from 'react';
import {  motion } from 'framer-motion';

function Slide ({content}: { content:(JSX.Element) }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            viewport={{ once: false }}
            className=""
            >
            {content}
        </motion.div>
    )
}

export { Slide }